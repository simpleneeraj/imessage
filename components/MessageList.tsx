"use client";

import { useLayoutEffect, useRef } from "react";
import { buildRows } from "@/lib/group";
import type { Message, Profile } from "@/lib/types";
import { DateSeparator } from "./DateSeparator";
import { MessageBubble } from "./MessageBubble";

const NEAR_BOTTOM_PX = 150;

export function MessageList({
  messages,
  isGroup,
  me,
  participants,
}: {
  messages: Message[];
  isGroup: boolean;
  me: string;
  participants: Profile[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const firstRenderRef = useRef(true);
  const lastKeyRef = useRef<string | null>(null);

  const rows = buildRows(messages, { isGroup, me });
  const profilesById = new Map(participants.map((p) => [p.id, p]));
  const last = messages[messages.length - 1];

  // Pin to the bottom: instantly on first paint, then only when the user is
  // already near the bottom (never yank them while reading history) — except
  // for our own sends, which always snap down.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !last) return;
    if (lastKeyRef.current === last.client_id) return;
    lastKeyRef.current = last.client_id;

    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    const ownSend = last.sender_id === me && last.status !== undefined;

    if (firstRenderRef.current) {
      el.scrollTop = el.scrollHeight;
      firstRenderRef.current = false;
    } else if (nearBottom || ownSend) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [last, me]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto overscroll-contain bg-white"
    >
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-end px-4 pb-2 pt-2">
        {rows.map((row) =>
          row.type === "separator" ? (
            <DateSeparator key={row.key} at={row.at} />
          ) : (
            <MessageBubble
              key={row.key}
              row={row}
              sender={profilesById.get(row.message.sender_id)}
            />
          )
        )}
      </div>
    </div>
  );
}
