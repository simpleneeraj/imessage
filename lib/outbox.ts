import { supabase } from "./supabase";
import { idb } from "./idb";
import type { Message, OutboxItem } from "./types";

// Messages composed offline wait here and are inserted on reconnect.
// The messages.client_id unique constraint makes retries idempotent:
// a 23505 means a previous attempt actually landed, so we just drop the item.

type FlushListener = (sent: Message[]) => void;
const listeners = new Set<FlushListener>();

export function onOutboxFlush(listener: FlushListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function enqueue(item: OutboxItem): Promise<void> {
  await idb.putAll("outbox", [item]);
}

let flushing = false;

export async function flushOutbox(): Promise<void> {
  if (flushing || typeof navigator !== "undefined" && !navigator.onLine) return;
  flushing = true;
  try {
    const items = await idb.getAll<OutboxItem>("outbox");
    if (items.length === 0) return;
    items.sort((a, b) => a.queued_at.localeCompare(b.queued_at));

    const sent: Message[] = [];
    for (const item of items) {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: item.conversation_id,
          sender_id: item.sender_id,
          body: item.body,
          client_id: item.client_id,
        })
        .select()
        .single();

      if (!error && data) {
        sent.push(data as Message);
        await idb.delete("outbox", item.client_id);
      } else if (error?.code === "23505") {
        await idb.delete("outbox", item.client_id);
      } else {
        break; // still offline or server error — retry on next flush
      }
    }

    if (sent.length > 0) {
      await idb.putAll("messages", sent);
      listeners.forEach((l) => l(sent));
    }
  } finally {
    flushing = false;
  }
}

let wired = false;

export function wireOutbox(): void {
  if (wired || typeof window === "undefined") return;
  wired = true;
  window.addEventListener("online", () => void flushOutbox());
  void flushOutbox();
}
