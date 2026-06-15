"use client";

import { useEffect, useState } from "react";
import { idb } from "@/lib/idb";
import type { Conversation, Message } from "@/lib/types";

// E2EE means the server can't search message text — search runs entirely
// over the local decrypted cache (titles + the messages this device has seen).

export type SearchHit = {
  conversation: Conversation;
  snippet: string | null; // null = matched by title
};

export function useSearch(
  query: string,
  conversations: Conversation[],
  me: string
): SearchHit[] {
  const [hits, setHits] = useState<SearchHit[]>([]);

  useEffect(() => {
    const term = query.trim().toLowerCase();
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (term.length < 2) {
        setHits([]);
        return;
      }
      const titleOf = (c: Conversation) =>
        c.name ??
        c.participants
          .filter((p) => p.id !== me)
          .map((p) => p.display_name)
          .join(", ");

      const byId = new Map(conversations.map((c) => [c.id, c]));
      const results = new Map<string, SearchHit>();

      for (const conv of conversations) {
        if (titleOf(conv).toLowerCase().includes(term)) {
          results.set(conv.id, { conversation: conv, snippet: null });
        }
      }

      const cached = await idb.getAll<Message>("messages");
      for (const msg of cached) {
        if (results.has(msg.conversation_id)) continue;
        const conv = byId.get(msg.conversation_id);
        if (!conv || msg.deleted_at) continue;
        if (msg.text && msg.text.toLowerCase().includes(term)) {
          results.set(conv.id, { conversation: conv, snippet: msg.text });
        }
      }

      if (!cancelled) setHits([...results.values()]);
    }, term.length < 2 ? 0 : 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, conversations, me]);

  return hits;
}
