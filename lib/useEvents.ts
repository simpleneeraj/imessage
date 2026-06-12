"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { ConversationEvent } from "./types";

// Audit-trail events (member added/removed/left, etc.) for a conversation,
// kept live so the inline system messages update in real time.
export function useEvents(conversationId: string, userId: string | null) {
  const [events, setEvents] = useState<ConversationEvent[]>([]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    void supabase
      .from("conversation_events")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!cancelled && data) setEvents(data as ConversationEvent[]);
      });

    const channel = supabase
      .channel(`events:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_events",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const e = payload.new as ConversationEvent;
          setEvents((cur) =>
            cur.some((x) => x.id === e.id) ? cur : [...cur, e]
          );
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  return events;
}
