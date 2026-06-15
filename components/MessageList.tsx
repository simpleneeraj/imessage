'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { buildRows } from '@/lib/group';
import type {
  ConversationEvent,
  Message,
  ParticipantMeta,
  Profile,
  Reaction,
  ReactionKind,
} from '@/lib/types';
import { DateSeparator } from './DateSeparator';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { Receipt } from './Receipt';
import { AttachmentBubble } from './AttachmentBubble';
import { ViewOnceBubble } from './ViewOnceBubble';
import { SystemMessage, systemEventText } from './SystemMessage';

const NEAR_BOTTOM_PX = 150;

function EditSheet({
  message,
  onSave,
  onCancel,
}: {
  message: Message;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(message.text ?? '');
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md rounded-t-2xl bg-background p-4 shadow-xl md:rounded-2xl"
      >
        <p className="mb-2 text-center text-[15px] font-semibold">
          Edit Message
        </p>
        <textarea
          data-testid="edit-textarea"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={3}
          autoFocus
          maxLength={4000}
          className="w-full resize-none rounded-[12px] border border-ring/60 bg-transparent px-3 py-2 text-[17px] outline-none"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2 text-[15px] text-primary active:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => value.trim() && onSave(value)}
            className="rounded-full bg-primary px-4 py-2 text-[15px] font-semibold text-white active:opacity-70"
          >
            Save
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function MessageList({
  messages,
  isGroup,
  me,
  participants,
  reactions,
  participantsMeta,
  typingUserIds,
  events = [],
  onReact,
  onReply,
  onUnsend,
  onEdit,
}: {
  messages: Message[];
  isGroup: boolean;
  me: string;
  participants: Profile[];
  reactions: Map<string, Reaction[]>;
  participantsMeta: ParticipantMeta[];
  typingUserIds: string[];
  events?: ConversationEvent[];
  onReact: (messageId: string, kind: ReactionKind) => void;
  onReply: (message: Message) => void;
  onUnsend: (message: Message) => void;
  onEdit: (message: Message, newText: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const firstRenderRef = useRef(true);
  const lastKeyRef = useRef<string | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);

  // Tapping a reply quote scrolls to the original and briefly flashes it.
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jumpToMessage = (messageId: string) => {
    const el = scrollRef.current?.querySelector<HTMLElement>(
      `[data-mid="${messageId}"]`,
    );
    if (!el) return; // original is outside the loaded window
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    setHighlightId(null);
    // next frame so the class re-applies and the animation restarts
    requestAnimationFrame(() => setHighlightId(messageId));
    highlightTimer.current = setTimeout(() => setHighlightId(null), 1500);
  };

  const rows = buildRows(messages, { isGroup, me });
  const profilesById = new Map(participants.map((p) => [p.id, p]));
  const messagesById = new Map(messages.map((m) => [m.id, m]));
  const last = messages[messages.length - 1];
  const lastOwn = [...messages].reverse().find((m) => m.sender_id === me);
  const typing = typingUserIds.length > 0;

  // Merge audit events into the message timeline by timestamp.
  type TimelineItem =
    | { kind: 'row'; at: string; key: string; row: (typeof rows)[number] }
    | { kind: 'event'; at: string; key: string; event: ConversationEvent };
  const timeline: TimelineItem[] = [
    ...rows.map((row) => ({
      kind: 'row' as const,
      key: row.key,
      at: row.type === 'separator' ? row.at : row.message.created_at,
      row,
    })),
    ...events.map((event) => ({
      kind: 'event' as const,
      key: `ev-${event.id}`,
      at: event.created_at,
      event,
    })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  // Pin to the bottom: instantly on first paint, then only when the user is
  // already near the bottom — except for own sends, which always snap down.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !last) return;
    const key = `${last.client_id}:${typing}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    const ownSend = last.sender_id === me && last.status !== undefined;

    if (firstRenderRef.current) {
      el.scrollTop = el.scrollHeight;
      firstRenderRef.current = false;
    } else if (nearBottom || ownSend) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [last, me, typing]);

  return (
    <div
      ref={scrollRef}
      className="chat-canvas flex-1 overflow-y-auto overscroll-contain"
    >
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-end px-4 pb-2 pt-2">
        {timeline.map((item) =>
          item.kind === 'event' ? (
            <SystemMessage
              key={item.key}
              text={systemEventText(item.event, profilesById, me)}
            />
          ) : item.row.type === 'separator' ? (
            <DateSeparator key={item.key} at={item.row.at} />
          ) : (
            (() => {
              const row = item.row;
              return (
                <div
                  key={item.key}
                  data-mid={row.message.id}
                  className={cn(
                    highlightId === row.message.id && 'msg-flash rounded-2xl',
                  )}
                >
                  <MessageBubble
                    row={row}
                    sender={profilesById.get(row.message.sender_id)}
                    me={me}
                    onJumpTo={jumpToMessage}
                    reactions={reactions.get(row.message.id) ?? []}
                    repliedTo={
                      row.message.reply_to
                        ? messagesById.get(row.message.reply_to)
                        : undefined
                    }
                    repliedSender={
                      row.message.reply_to
                        ? profilesById.get(
                            messagesById.get(row.message.reply_to)?.sender_id ??
                              '',
                          )
                        : undefined
                    }
                    onReact={onReact}
                    onReply={onReply}
                    onUnsend={onUnsend}
                    onEdit={(msg) => setEditing(msg)}
                  >
                    {row.message.payload?.kind === 'file' &&
                      !row.message.deleted_at &&
                      (row.message.view_once ? (
                        <ViewOnceBubble
                          message={row.message}
                          payload={row.message.payload}
                          mine={row.mine}
                        />
                      ) : (
                        <AttachmentBubble
                          payload={row.message.payload}
                          mine={row.mine}
                        />
                      ))}
                  </MessageBubble>
                  {row.message.client_id === lastOwn?.client_id && (
                    <Receipt
                      lastOwnMessage={lastOwn}
                      participantsMeta={participantsMeta}
                      me={me}
                    />
                  )}
                </div>
              );
            })()
          ),
        )}

        <AnimatePresence>
          {typing && (
            <TypingIndicator
              typists={typingUserIds
                .map((tid) => profilesById.get(tid))
                .filter((p): p is Profile => Boolean(p))}
              isGroup={isGroup}
            />
          )}
        </AnimatePresence>
      </div>

      {editing && (
        <EditSheet
          message={editing}
          onSave={(text) => {
            onEdit(editing, text);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
