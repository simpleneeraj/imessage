"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { idb } from "@/lib/idb";
import { getConvKey } from "@/lib/keys";
import { decryptEnvelope, isEnvelope } from "@/lib/crypto";
import { setPreview } from "@/lib/previews";
import { previewText } from "@/hooks/useMessages";
import type { Conversation, Profile, Message } from "@/lib/types";

type ConversationRow = Omit<Conversation, "participants"> & {
  conversation_participants: {
    user_id: string;
    last_read_at: string | null;
    hidden_at: string | null;
    profiles: Profile;
  }[];
};

function sortByActivity(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) =>
    (b.last_message_at ?? b.created_at).localeCompare(a.last_message_at ?? a.created_at)
  );
}

async function handleIncomingMessage(msg: Message) {
  if (msg.deleted_at) return;

  let text = msg.body;
  let payload = undefined;

  if (isEnvelope(msg.body)) {
    const convKey = await getConvKey(msg.conversation_id);
    if (!convKey) return;
    try {
      const decrypted = await decryptEnvelope(msg.body, convKey, msg.conversation_id);
      payload = decrypted;
      text = "text" in decrypted ? decrypted.text : "";
    } catch {
      text = "";
    }
  }

  const decryptedMsg: Message = {
    ...msg,
    text,
    payload,
  };

  void setPreview(msg.conversation_id, {
    text: previewText(decryptedMsg),
    at: msg.created_at,
  });
}

export function useConversations(userId: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from("conversations")
      .select(
        "*, conversation_participants(user_id, last_read_at, hidden_at, profiles(*))"
      )
      .order("updated_at", { ascending: false });
    if (error || !data || !userId) return;

    const fresh = (data as ConversationRow[])
      .map(({ conversation_participants, ...conv }) => {
        const mine = conversation_participants.find((p) => p.user_id === userId);
        return {
          ...conv,
          participants: conversation_participants.map((p) => p.profiles),
          myLastReadAt: mine?.last_read_at ?? null,
          myHiddenAt: mine?.hidden_at ?? null,
        };
      })
      // "delete for self" hides it for me; "delete for everyone" hides it for
      // non-admins (the admin keeps it, dimmed, to restore).
      .filter(
        (c) =>
          !c.myHiddenAt &&
          (!c.deleted_at || c.created_by === userId)
      );
    setConversations(sortByActivity(fresh));
    setLoading(false);
    void idb.putAll("conversations", fresh);
  }, [userId]);

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
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          if (cancelled) return;
          const msg = payload.new as Message;
          void handleIncomingMessage(msg);
        }
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
