"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { useConversations } from "@/lib/useConversations";
import { listTime } from "@/lib/time";
import type { Conversation } from "@/lib/types";
import { Avatar } from "./Avatar";
import { OfflineBanner } from "./OfflineBanner";
import { Spinner } from "@/components/ui/spinner";

function conversationTitle(conv: Conversation, me: string): string {
  const others = conv.participants.filter((p) => p.id !== me);
  if (conv.is_group) {
    return conv.name ?? others.map((p) => p.display_name.split(" ")[0]).join(", ");
  }
  return others[0]?.display_name ?? "Chat";
}

function RowAvatar({ conv, me }: { conv: Conversation; me: string }) {
  const others = conv.participants.filter((p) => p.id !== me);
  if (conv.is_group && others.length > 1) {
    return (
      <div className="relative size-[45px] shrink-0">
        <Avatar name={others[0].display_name} size={32} className="absolute left-0 top-0" />
        <Avatar
          name={others[1].display_name}
          size={28}
          className="absolute bottom-0 right-0 ring-2 ring-white"
        />
      </div>
    );
  }
  return <Avatar name={others[0]?.display_name ?? "?"} size={45} />;
}

export function ConversationList() {
  const { userId, profile } = useAuth();
  const { conversations, loading } = useConversations(userId);

  return (
    <div className="flex h-dvh flex-col bg-white">
      <header className="shrink-0 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between">
          <h1 className="text-[34px] font-bold tracking-tight">Messages</h1>
          <Link
            href="/new"
            aria-label="New message"
            className="flex size-11 items-center justify-center text-imsg-blue active:opacity-60"
          >
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5" />
              <path d="M17.5 3.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
            </svg>
          </Link>
        </div>
        <p className="mx-auto w-full max-w-2xl pb-2 text-[13px] text-imsg-text-gray">
          Signed in as @{profile.username}
        </p>
      </header>

      <OfflineBanner />

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-2xl">
          {loading && conversations.length === 0 ? (
            <div className="flex justify-center py-16">
              <Spinner className="size-6 text-imsg-text-gray" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-8 py-16 text-center">
              <p className="text-[17px] font-semibold">No Messages</p>
              <p className="text-[15px] text-imsg-text-gray">
                Tap the compose button to start a conversation by username.
              </p>
            </div>
          ) : (
            conversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/chat/${conv.id}`}
                className="flex items-center gap-3 pl-4 active:bg-imsg-gray/50"
              >
                <RowAvatar conv={conv} me={userId} />
                <div className="hairline-b flex min-w-0 flex-1 items-start justify-between gap-2 py-2.5 pr-3">
                  <div className="min-w-0">
                    <p className="truncate text-[17px] font-semibold leading-[22px]">
                      {conversationTitle(conv, userId)}
                    </p>
                    <p className="line-clamp-2 text-[15px] leading-[20px] text-imsg-text-gray">
                      {conv.last_message_text ?? "No messages yet"}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 pt-0.5 text-[15px] text-imsg-text-gray">
                    {listTime(conv.last_message_at ?? conv.created_at)}
                    <svg viewBox="0 0 24 24" className="size-3.5 text-imsg-chevron" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
