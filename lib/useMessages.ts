"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { idb } from "./idb";
import { enqueue, flushOutbox, onOutboxFlush } from "./outbox";
import type { Message } from "./types";

// Optimistic rows use client_id as their id until the server row arrives
// (via insert response, realtime echo, or outbox flush) and replaces them.
function merge(current: Message[], incoming: Message[]): Message[] {
  const byClientId = new Map<string, Message>();
  for (const msg of [...current, ...incoming]) {
    const existing = byClientId.get(msg.client_id);
    // Server rows (no local status) win over optimistic ones.
    if (!existing || existing.status) byClientId.set(msg.client_id, msg);
  }
  return [...byClientId.values()].sort((a, b) =>
    a.created_at === b.created_at
      ? a.client_id.localeCompare(b.client_id)
      : a.created_at.localeCompare(b.created_at)
  );
}

export function useMessages(conversationId: string, userId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    void idb
      .getAllByIndex<Message>("messages", "by_conv", conversationId)
      .then((cached) => {
        if (cancelled || cached.length === 0) return;
        setMessages((current) => merge(current, cached));
        setLoading(false);
      });

    void supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const fresh = data as Message[];
        setMessages((current) => merge(current, fresh));
        setLoading(false);
        void idb.putAll("messages", fresh);
      })
      .then(() => {
        if (!cancelled) setLoading(false);
      });

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((current) => merge(current, [msg]));
          void idb.putAll("messages", [msg]);
        }
      )
      .subscribe();

    const unsubscribeFlush = onOutboxFlush((sent) => {
      const relevant = sent.filter((m) => m.conversation_id === conversationId);
      if (relevant.length > 0) setMessages((current) => merge(current, relevant));
    });

    return () => {
      cancelled = true;
      unsubscribeFlush();
      void supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  const send = useCallback(
    async (body: string) => {
      if (!userId) return;
      const trimmed = body.trim();
      if (!trimmed) return;

      const client_id = crypto.randomUUID();
      const offline = !navigator.onLine;
      const optimistic: Message = {
        id: client_id,
        conversation_id: conversationId,
        sender_id: userId,
        body: trimmed,
        client_id,
        created_at: new Date().toISOString(),
        status: offline ? "queued" : "sending",
      };
      setMessages((current) => merge(current, [optimistic]));

      const queue = () =>
        enqueue({
          client_id,
          conversation_id: conversationId,
          sender_id: userId,
          body: trimmed,
          queued_at: optimistic.created_at,
        }).then(() => {
          setMessages((current) =>
            current.map((m) =>
              m.client_id === client_id ? { ...m, status: "queued" } : m
            )
          );
          void idb.putAll("messages", [{ ...optimistic, status: "queued" }]);
        });

      if (offline) {
        await queue();
        return;
      }

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          body: trimmed,
          client_id,
        })
        .select()
        .single();

      if (error) {
        // Network-level failure → queue for retry. RLS/validation errors would
        // also land here, but retrying those is harmless thanks to client_id.
        await queue();
        void flushOutbox();
        return;
      }

      const sent = data as Message;
      setMessages((current) => merge(current, [sent]));
      void idb.putAll("messages", [sent]);
    },
    [conversationId, userId]
  );

  return { messages, loading, send };
}
