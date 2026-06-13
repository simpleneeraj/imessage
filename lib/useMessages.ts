"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import { idb } from "./idb";
import { enqueue, flushOutbox, onOutboxFlush } from "./outbox";
import { getConvKey } from "./keys";
import {
  decryptEnvelope,
  encryptEnvelope,
  isEnvelope,
  type MessagePayload,
} from "./crypto";
import { removePreview, setPreview } from "./previews";
import type {
  Message,
  ParticipantMeta,
  Reaction,
  ReactionKind,
} from "./types";

const TYPING_THROTTLE_MS = 2000;
const TYPING_EXPIRY_MS = 4000;
const READ_THROTTLE_MS = 3000;

export function previewText(msg: Message): string {
  if (msg.deleted_at) return "Message unsent";
  if (msg.payload?.kind === "file") {
    return msg.payload.mime.startsWith("image/")
      ? "📷 Photo"
      : msg.payload.mime.startsWith("video/")
        ? "📹 Video"
        : "📎 Attachment";
  }
  if (msg.payload?.kind === "call") {
    return msg.payload.media === "video" ? "📹 Video call" : "📞 Voice call";
  }
  return msg.text ?? "Message";
}

/** Decrypt a server row in place (adds .text / .payload). */
async function decryptMessage(msg: Message): Promise<Message> {
  if (msg.deleted_at) return { ...msg, text: "", payload: undefined };
  if (!isEnvelope(msg.body)) return { ...msg, text: msg.body }; // legacy plaintext
  const convKey = await getConvKey(msg.conversation_id);
  if (!convKey) return { ...msg, text: undefined }; // key not yet available
  try {
    const payload = await decryptEnvelope(msg.body, convKey, msg.conversation_id);
    return {
      ...msg,
      payload,
      text: "text" in payload ? payload.text : "",
    };
  } catch {
    return { ...msg, text: null }; // wrong key / corrupt
  }
}

function merge(current: Message[], incoming: Message[]): Message[] {
  const byClientId = new Map<string, Message>();
  for (const msg of [...current, ...incoming]) {
    const existing = byClientId.get(msg.client_id);
    if (!existing) {
      byClientId.set(msg.client_id, msg);
      continue;
    }
    // Server rows (no local status) win; among server rows, later wins
    // (UPDATE events for edit/unsend). Preserve decrypted fields.
    const winner =
      existing.status && !msg.status
        ? msg
        : !existing.status && msg.status
          ? existing
          : msg;
    const loser = winner === msg ? existing : msg;
    byClientId.set(msg.client_id, {
      ...winner,
      text: winner.text !== undefined ? winner.text : loser.text,
      payload: winner.payload ?? loser.payload,
    });
  }
  return [...byClientId.values()].sort((a, b) =>
    a.created_at === b.created_at
      ? a.client_id.localeCompare(b.client_id)
      : a.created_at.localeCompare(b.created_at)
  );
}

export type SendOptions = { ephemeral?: boolean; reply_to?: string | null };

export function useMessages(conversationId: string, userId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Map<string, Reaction[]>>(new Map());
  const [participantsMeta, setParticipantsMeta] = useState<ParticipantMeta[]>([]);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const lastTypingSent = useRef(0);
  const lastReadSent = useRef(0);
  const readTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePreview = useCallback(
    (msg: Message) => {
      void setPreview(conversationId, {
        text: previewText(msg),
        at: msg.created_at,
      });
    },
    [conversationId]
  );

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    // --- initial loads ---

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
      .then(async ({ data }) => {
        if (cancelled || !data) {
          setLoading(false);
          return;
        }
        const fresh = await Promise.all((data as Message[]).map(decryptMessage));
        if (cancelled) return;
        setMessages((current) => merge(current, fresh));
        setLoading(false);
        void idb.putAll("messages", fresh);
        const newest = fresh[0];
        if (newest) updatePreview(newest);
      });

    void supabase
      .from("message_reactions")
      .select("*")
      .eq("conversation_id", conversationId)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const map = new Map<string, Reaction[]>();
        for (const r of data as Reaction[]) {
          map.set(r.message_id, [...(map.get(r.message_id) ?? []), r]);
        }
        setReactions(map);
      });

    void supabase
      .from("conversation_participants")
      .select("conversation_id, user_id, last_read_at")
      .eq("conversation_id", conversationId)
      .then(({ data }) => {
        if (!cancelled && data) setParticipantsMeta(data as ParticipantMeta[]);
      });

    // --- consolidated realtime channel ---

    const markTyping = (typistId: string) => {
      if (typistId === userId) return;
      setTypingUserIds((ids) =>
        ids.includes(typistId) ? ids : [...ids, typistId]
      );
      const timers = typingTimers.current;
      clearTimeout(timers.get(typistId));
      timers.set(
        typistId,
        setTimeout(() => {
          setTypingUserIds((ids) => ids.filter((id) => id !== typistId));
        }, TYPING_EXPIRY_MS)
      );
    };

    const clearTyping = (typistId: string) => {
      setTypingUserIds((ids) => ids.filter((id) => id !== typistId));
    };

    const channel = supabase
      .channel(`conv:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          void (async () => {
            const msg = await decryptMessage(payload.new as Message);
            if (cancelled) return;
            setMessages((current) => merge(current, [msg]));
            void idb.putAll("messages", [msg]);
            updatePreview(msg);
            clearTyping(msg.sender_id);
          })();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          void (async () => {
            const msg = await decryptMessage(payload.new as Message);
            if (cancelled) return;
            setMessages((current) =>
              current.map((m) => (m.id === msg.id ? { ...msg, status: undefined } : m))
            );
            void idb.putAll("messages", [msg]);
          })();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id?: string }).id;
          if (!deletedId) return;
          setMessages((current) => current.filter((m) => m.id !== deletedId));
          void idb.delete("messages", deletedId);
          // Vanished text must not survive in the list preview.
          void removePreview(conversationId);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setReactions((map) => {
            const next = new Map(map);
            if (payload.eventType === "DELETE") {
              const old = payload.old as Partial<Reaction>;
              if (!old.message_id || !old.user_id) return map;
              next.set(
                old.message_id,
                (next.get(old.message_id) ?? []).filter(
                  (r) => r.user_id !== old.user_id
                )
              );
            } else {
              const r = payload.new as Reaction;
              next.set(r.message_id, [
                ...(next.get(r.message_id) ?? []).filter(
                  (x) => x.user_id !== r.user_id
                ),
                r,
              ]);
            }
            return next;
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversation_participants",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const meta = payload.new as ParticipantMeta;
          setParticipantsMeta((current) => [
            ...current.filter((p) => p.user_id !== meta.user_id),
            meta,
          ]);
        }
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const typistId = (payload as { user_id?: string }).user_id;
        if (typistId) markTyping(typistId);
      })
      .subscribe();
    channelRef.current = channel;

    const unsubscribeFlush = onOutboxFlush((sent) => {
      void (async () => {
        const relevant = await Promise.all(
          sent
            .filter((m) => m.conversation_id === conversationId)
            .map(decryptMessage)
        );
        if (relevant.length > 0 && !cancelled) {
          setMessages((current) => merge(current, relevant));
        }
      })();
    });

    const timers = typingTimers.current;
    return () => {
      cancelled = true;
      unsubscribeFlush();
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [conversationId, userId, updatePreview]);

  // --- actions ---

  const sendPayload = useCallback(
    async (
      payload: MessagePayload,
      options: SendOptions & {
        view_once?: boolean;
        attachment_path?: string | null;
        reply_to?: string | null;
      } = {}
    ) => {
      if (!userId) return;
      const convKey = await getConvKey(conversationId);
      if (!convKey) return;

      const body = await encryptEnvelope(payload, convKey, conversationId);
      const client_id = crypto.randomUUID();
      const offline = !navigator.onLine;
      const text = "text" in payload ? payload.text : "";
      const optimistic: Message = {
        id: client_id,
        conversation_id: conversationId,
        sender_id: userId,
        body,
        client_id,
        created_at: new Date().toISOString(),
        ephemeral: options.ephemeral ?? false,
        view_once: options.view_once ?? false,
        attachment_path: options.attachment_path ?? null,
        viewed_at: null,
        deleted_at: null,
        edited_at: null,
        reply_to: options.reply_to ?? null,
        text,
        payload,
        status: offline ? "queued" : "sending",
      };
      setMessages((current) => merge(current, [optimistic]));
      updatePreview(optimistic);

      const row = {
        conversation_id: conversationId,
        sender_id: userId,
        body,
        client_id,
        ephemeral: optimistic.ephemeral,
        view_once: optimistic.view_once,
        attachment_path: optimistic.attachment_path,
        reply_to: optimistic.reply_to,
      };

      const queue = () =>
        enqueue({
          ...row,
          text,
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
        .insert(row)
        .select()
        .single();

      if (error) {
        await queue();
        void flushOutbox();
        return;
      }

      const sent = { ...(data as Message), text, payload };
      setMessages((current) => merge(current, [sent]));
      void idb.putAll("messages", [sent]);
    },
    [conversationId, userId, updatePreview]
  );

  const send = useCallback(
    (text: string, options: SendOptions = {}) => {
      const trimmed = text.trim();
      if (!trimmed || trimmed.length > 4000) return Promise.resolve();
      return sendPayload({ kind: "text", text: trimmed }, options);
    },
    [sendPayload]
  );

  const react = useCallback(
    async (messageId: string, kind: ReactionKind) => {
      if (!userId) return;
      const mine = (reactions.get(messageId) ?? []).find(
        (r) => r.user_id === userId
      );
      if (mine && mine.reaction === kind) {
        await supabase
          .from("message_reactions")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", userId);
      } else {
        await supabase.from("message_reactions").upsert(
          {
            message_id: messageId,
            conversation_id: conversationId,
            user_id: userId,
            reaction: kind,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "message_id,user_id" }
        );
      }
    },
    [conversationId, userId, reactions]
  );

  const unsend = useCallback(async (msg: Message) => {
    if (msg.attachment_path) {
      await supabase.storage.from("attachments").remove([msg.attachment_path]);
    }
    await supabase
      .from("messages")
      .update({
        deleted_at: new Date().toISOString(),
        body: "unsent",
        attachment_path: null,
      })
      .eq("id", msg.id);
  }, []);

  const edit = useCallback(
    async (msg: Message, newText: string) => {
      const trimmed = newText.trim();
      if (!trimmed || trimmed.length > 4000) return;
      const convKey = await getConvKey(conversationId);
      if (!convKey) return;
      const body = await encryptEnvelope(
        { kind: "text", text: trimmed },
        convKey,
        conversationId
      );
      await supabase
        .from("messages")
        .update({ body, edited_at: new Date().toISOString() })
        .eq("id", msg.id);
    },
    [conversationId]
  );

  const markRead = useCallback(() => {
    if (!userId) return;
    const fire = () => {
      lastReadSent.current = Date.now();
      // .then() matters: supabase builders only execute when awaited
      void supabase
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", userId)
        .then(() => {});
    };
    const since = Date.now() - lastReadSent.current;
    if (since >= READ_THROTTLE_MS) {
      fire();
    } else if (!readTimer.current) {
      // trailing edge: a read triggered during the cooldown must still land,
      // otherwise the sender never sees "Read" for the latest message
      readTimer.current = setTimeout(() => {
        readTimer.current = null;
        fire();
      }, READ_THROTTLE_MS - since);
    }
  }, [conversationId, userId]);

  const sendTyping = useCallback(() => {
    if (!userId || !channelRef.current) return;
    const now = Date.now();
    if (now - lastTypingSent.current < TYPING_THROTTLE_MS) return;
    lastTypingSent.current = now;
    void channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: userId },
    });
  }, [userId]);

  return {
    messages,
    reactions,
    participantsMeta,
    typingUserIds,
    loading,
    send,
    sendPayload,
    react,
    unsend,
    edit,
    markRead,
    sendTyping,
  };
}
