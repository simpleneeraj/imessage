"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { idb } from "@/lib/idb";
import { useAuth } from "./AuthProvider";
import { useMessages } from "@/lib/useMessages";
import type { Conversation, Profile } from "@/lib/types";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { OfflineBanner } from "./OfflineBanner";

type ConversationRow = Omit<Conversation, "participants"> & {
  conversation_participants: { profiles: Profile }[];
};

function useConversation(id: string): Conversation | null {
  const [conversation, setConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    let cancelled = false;

    void idb.getAll<Conversation>("conversations").then((cached) => {
      const hit = cached.find((c) => c.id === id);
      if (hit && !cancelled) setConversation((cur) => cur ?? hit);
    });

    void supabase
      .from("conversations")
      .select("*, conversation_participants(profiles(*))")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        const { conversation_participants, ...conv } = data as ConversationRow;
        const fresh = {
          ...conv,
          participants: conversation_participants.map((p) => p.profiles),
        };
        setConversation(fresh);
        void idb.putAll("conversations", [fresh]);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return conversation;
}

export function ChatThread({ id }: { id: string }) {
  const { userId } = useAuth();
  const conversation = useConversation(id);
  const { messages, send } = useMessages(id, userId);

  const others = useMemo(
    () => conversation?.participants.filter((p) => p.id !== userId) ?? [],
    [conversation, userId]
  );

  const title = !conversation
    ? ""
    : conversation.is_group
      ? (conversation.name ?? `${others.length} People`)
      : (others[0]?.display_name ?? "Chat");

  return (
    <div className="flex h-dvh flex-col bg-white">
      <ChatHeader title={title} others={others} />
      <OfflineBanner />
      <MessageList
        messages={messages}
        isGroup={conversation?.is_group ?? false}
        me={userId}
        participants={conversation?.participants ?? []}
      />
      <Composer onSend={(body) => void send(body)} />
    </div>
  );
}
