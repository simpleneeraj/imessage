import { supabase } from "./supabase";
import { idb } from "./idb";
import {
  generateConvKey,
  unwrapConvKey,
  wrapConvKey,
} from "./crypto";
import type { Profile } from "./types";

// Conversation-key orchestration. CryptoKey objects are structured-cloneable,
// so both the identity private key (kv "privateKey") and unwrapped
// conversation keys (convkeys store) live directly in IndexedDB.

type ConvKeyRecord = { conversation_id: string; key: CryptoKey };

const memCache = new Map<string, CryptoKey>();

export async function getPrivateKey(): Promise<CryptoKey | null> {
  return (await idb.kvGet<CryptoKey>("privateKey")) ?? null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Resolve the AES key for a conversation: memory → IndexedDB → fetch + unwrap.
 * Retries briefly because a recipient can learn about a conversation moments
 * before its key grant row lands. Returns null rather than throwing — callers
 * render placeholders and try again on the next event.
 */
export async function getConvKey(conversationId: string): Promise<CryptoKey | null> {
  const cached = memCache.get(conversationId);
  if (cached) return cached;

  const stored = (
    await idb.getAll<ConvKeyRecord>("convkeys")
  ).find((r) => r.conversation_id === conversationId);
  if (stored) {
    memCache.set(conversationId, stored.key);
    return stored.key;
  }

  const privateKey = await getPrivateKey();
  if (!privateKey) return null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: row } = await supabase
      .from("conversation_keys")
      .select("wrapped_key, iv, wrapped_by")
      .eq("conversation_id", conversationId)
      .maybeSingle();

    if (row) {
      const { data: wrapper } = await supabase
        .from("profiles")
        .select("public_key")
        .eq("id", row.wrapped_by)
        .single();
      if (!wrapper?.public_key) return null;

      try {
        const key = await unwrapConvKey(
          row.wrapped_key,
          row.iv,
          privateKey,
          wrapper.public_key,
          conversationId
        );
        memCache.set(conversationId, key);
        await idb.putAll("convkeys", [{ conversation_id: conversationId, key }]);
        return key;
      } catch {
        return null; // corrupt/foreign grant — undecryptable
      }
    }
    await sleep(1000);
  }
  return null;
}

/**
 * Create the conversation key and grant it to every participant (incl. self —
 * the self-wrap goes through the same ECDH path with our own public key).
 */
export async function createConvKey(
  conversationId: string,
  participants: Pick<Profile, "id" | "public_key">[],
  myId: string
): Promise<CryptoKey | null> {
  // The RPC may have returned an existing 1:1 — never overwrite its key.
  const existing = await getConvKey(conversationId);
  if (existing) return existing;

  const privateKey = await getPrivateKey();
  if (!privateKey) return null;

  const convKey = await generateConvKey();
  const rows = [];
  for (const p of participants) {
    if (!p.public_key) continue; // legacy users blocked upstream in NewChat
    const { wrapped_key, iv } = await wrapConvKey(
      convKey,
      privateKey,
      p.public_key,
      conversationId
    );
    rows.push({
      conversation_id: conversationId,
      user_id: p.id,
      wrapped_key,
      iv,
      wrapped_by: myId,
    });
  }

  const { error } = await supabase.from("conversation_keys").insert(rows);
  if (error && error.code !== "23505") return null; // 23505 = lost a race, fine

  memCache.set(conversationId, convKey);
  await idb.putAll("convkeys", [{ conversation_id: conversationId, key: convKey }]);
  return convKey;
}

/** Grant the key to a member added later (wired up when member-add UI exists). */
export async function grantConvKey(
  conversationId: string,
  member: Pick<Profile, "id" | "public_key">,
  myId: string
): Promise<boolean> {
  const convKey = await getConvKey(conversationId);
  const privateKey = await getPrivateKey();
  if (!convKey || !privateKey || !member.public_key) return false;
  const { wrapped_key, iv } = await wrapConvKey(
    convKey,
    privateKey,
    member.public_key,
    conversationId
  );
  const { error } = await supabase.from("conversation_keys").insert({
    conversation_id: conversationId,
    user_id: member.id,
    wrapped_key,
    iv,
    wrapped_by: myId,
  });
  return !error || error.code === "23505";
}

export function clearKeyCache(): void {
  memCache.clear();
}
