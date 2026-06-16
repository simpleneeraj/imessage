import { idb } from "./idb";

// Lets a delete action optimistically drop a conversation from the live list +
// cache, instead of waiting on the server round-trip (which, for "delete for
// me", isn't even mirrored by a realtime event) — that lag is what made a
// just-deleted chat blink back for a second or two.

type Listener = (id: string) => void;
const listeners = new Set<Listener>();

export function onConversationRemoved(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function removeConversationLocally(id: string): void {
  void idb.delete("conversations", id);
  listeners.forEach((l) => l(id));
}
