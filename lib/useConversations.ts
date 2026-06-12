"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { idb } from "./idb";
import type { Conversation, Profile } from "./types";

type ConversationRow = Omit<Conversation, "participants"> & {
  conversation_participants: { profiles: Profile }[];
};

function sortByActivity(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) =>
    (b.last_message_at ?? b.created_at).localeCompare(a.last_message_at ?? a.created_at)
  );
}

export function useConversations(userId: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from("conversations")
      .select("*, conversation_participants(profiles(*))")
      .order("updated_at", { ascending: false });
    if (error || !data) return;

    const fresh = (data as ConversationRow[]).map(
      ({ conversation_participants, ...conv }) => ({
        ...conv,
        participants: conversation_participants.map((p) => p.profiles),
      })
    );
    setConversations(sortByActivity(fresh));
    setLoading(false);
    void idb.putAll("conversations", fresh);
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    // Cached copy first so the list renders instantly (and offline).
    void idb.getAll<Conversation>("conversations").then((cached) => {
      if (!cancelled && cached.length > 0) {
        setConversations((current) =>
          current.length > 0 ? current : sortByActivity(cached)
        );
        setLoading(false);
      }
    });

    const channel = supabase
      .channel(`conversations:${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations" },
        () => void refetch()
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_participants",
          filter: `user_id=eq.${userId}`,
        },
        () => void refetch()
      )
      // Fetch once the subscription is live so no event can slip between
      // the initial fetch and the subscribe.
      .subscribe((status) => {
        if (cancelled) return;
        if (status === "SUBSCRIBED") {
          void refetch().finally(() => {
            if (!cancelled) setLoading(false);
          });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setLoading(false); // offline — cached data is all we have
        }
      });

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [userId, refetch]);

  return { conversations, loading, refetch };
}
