'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { idb } from '@/lib/idb';
import { encryptAndUpload } from '@/lib/attachments';
import { useAuth } from './AuthProvider';
import { useMessages } from '@/hooks/useMessages';
import { useEvents } from '@/hooks/useEvents';
import { useConversationActions } from '@/hooks/useConversationActions';
import type { Conversation, Message, Profile } from '@/lib/types';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import { OfflineBanner } from './OfflineBanner';
import { ChatDetails } from './ChatDetails';
import { ThemePicker } from './ThemePicker';
import { Celebration } from './Celebration';
import type { Expression } from '@/lib/expressions';
import MaskWallpaper from '@/plugins/mask-wallpaper';
import { parseWallpaper, wallpaperOptionsFor } from '@/utils/config';

type ConversationRow = Omit<Conversation, 'participants'> & {
  conversation_participants: {
    user_id: string;
    nickname: string | null;
    profiles: Profile;
  }[];
};

function useConversation(id: string): Conversation | null {
  const [conversation, setConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    let cancelled = false;

    void idb.getAll<Conversation>('conversations').then((cached) => {
      const hit = cached.find((c) => c.id === id);
      if (hit && !cancelled) setConversation((cur) => cur ?? hit);
    });

    const load = () =>
      void supabase
        .from('conversations')
        .select(
          '*, conversation_participants(user_id, nickname, profiles(*))',
        )
        .eq('id', id)
        .maybeSingle()
        .then(({ data }) => {
          if (cancelled || !data) return;
          const { conversation_participants, ...conv } =
            data as ConversationRow;
          const fresh = {
            ...conv,
            participants: conversation_participants.map((p) => ({
              ...p.profiles,
              nickname: p.nickname,
              display_name: p.nickname ?? p.profiles.display_name,
            })),
          };
          setConversation(fresh);
          void idb.putAll('conversations', [fresh]);
        });
    load();

    const channel = supabase
      .channel(`conv-meta:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setConversation((cur) =>
            cur ? { ...cur, ...(payload.new as Partial<Conversation>) } : cur,
          );
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_events',
          filter: `conversation_id=eq.${id}`,
        },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [id]);

  return conversation;
}

export function ChatThread({ id }: { id: string }) {
  const { userId } = useAuth();
  const conversation = useConversation(id);

  return (
    <ChatThreadInner id={id} userId={userId} conversation={conversation} />
  );
}

function ChatThreadInner({
  id,
  userId,
  conversation,
}: {
  id: string;
  userId: string;
  conversation: Conversation | null;
}) {
  const router = useRouter();
  const {
    messages,
    reactions,
    participantsMeta,
    typingUserIds,
    send,
    sendPayload,
    react,
    unsend,
    edit,
    markRead,
    sendTyping,
  } = useMessages(id, userId);

  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const events = useEvents(id, userId);
  const wallpaper = conversation?.wallpaper ?? null;
  const wallpaperOptions = useMemo(
    () => wallpaperOptionsFor(wallpaper),
    [wallpaper],
  );
  const bubbleColor = useMemo(
    () => parseWallpaper(wallpaper)?.bubble ?? null,
    [wallpaper],
  );

  const others = useMemo(
    () => conversation?.participants.filter((p) => p.id !== userId) ?? [],
    [conversation, userId],
  );

  const vibe = conversation?.vibe ?? 'classic';
  const [celebration, setCelebration] = useState<{
    kind: 'hearts' | 'confetti';
    key: number;
  } | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const primedRef = useRef(false);
  useEffect(() => {
    if (messages.length === 0) return;
    if (!primedRef.current) {
      for (const m of messages) seenRef.current.add(m.client_id);
      primedRef.current = true;
      return;
    }
    for (const m of messages) {
      if (seenRef.current.has(m.client_id)) continue;
      seenRef.current.add(m.client_id);
      if (
        m.payload?.kind === 'expression' &&
        m.payload.effect !== 'none' &&
        !m.deleted_at
      ) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to a realtime arrival, not derived state
        setCelebration({ kind: m.payload.effect, key: Date.now() });
      }
    }
  }, [messages]);
  useEffect(() => {
    if (!celebration) return;
    const t = setTimeout(() => setCelebration(null), 3200);
    return () => clearTimeout(t);
  }, [celebration]);

  useEffect(() => {
    if (document.visibilityState === 'visible') markRead();
    const onVisible = () => {
      if (document.visibilityState === 'visible') markRead();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [markRead, messages.length]);

  const actions = useConversationActions(id);

  const vanish = conversation?.vanish_mode ?? false;
  useEffect(() => {
    if (!vanish) return;
    const sweep = () => {
      if (navigator.onLine) actions.deleteVanished();
    };
    window.addEventListener('pagehide', sweep);
    return () => {
      window.removeEventListener('pagehide', sweep);
      sweep();
    };
  }, [vanish, actions]);

  const isAdmin = conversation?.created_by === userId;
  const deleted = Boolean(conversation?.deleted_at);

  const toggleVanish = () => actions.setVanishMode(!vanish);

  const deleteForMe = () => {
    actions.hideConversation();
    router.push('/chats');
  };
  const deleteForEveryone = () => {
    actions.setDeleted(true);
    router.push('/chats');
  };
  const restore = () => actions.setDeleted(false);

  const title = !conversation
    ? ''
    : conversation.is_group
      ? (conversation.name ?? `${others.length} People`)
      : (others[0]?.display_name ?? 'Chat');

  return (
    <div
      className={cn(
        'relative flex h-full min-h-0 flex-col bg-(--chat-bg) transition-colors duration-300',
        vanish && 'vanish',
        wallpaperOptions && 'has-wallpaper',
      )}
      style={
        !vanish && bubbleColor
          ? ({
              '--bubble-bg': bubbleColor,
            } as React.CSSProperties)
          : undefined
      }
    >
      {!vanish && wallpaperOptions && (
        <>
          <MaskWallpaper
            options={wallpaperOptions}
            className="pointer-events-none absolute inset-0 z-0 h-full w-full"
          />
          <div className="pointer-events-none absolute inset-0 z-0" style={{ background: 'var(--wallpaper-overlay)' }} />
        </>
      )}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <ChatHeader
          title={title}
          others={others}
          conversationId={id}
          onOpenDetails={() => setDetailsOpen(true)}
          onOpenTheme={() => setThemeOpen(true)}
          vanish={vanish}
          onToggleVanish={toggleVanish}
          isAdmin={isAdmin}
          deleted={deleted}
          onDeleteForMe={deleteForMe}
          onDeleteForEveryone={deleteForEveryone}
          onRestore={restore}
        />
        <OfflineBanner />
        <AnimatePresence>
          {vanish && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{
                background:
                  'linear-gradient(to right, color-mix(in oklab, var(--bubble-bg) 45%, #000), var(--bubble-bg), color-mix(in oklab, var(--bubble-bg) 45%, #000))',
              }}
              className="shrink-0 overflow-hidden text-center"
            >
              <p className="px-4 py-1.5 text-[12px] font-medium text-white/90">
                Vanish mode — messages disappear after everyone has seen them
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        <MessageList
          messages={messages}
          isGroup={conversation?.is_group ?? false}
          me={userId}
          participants={conversation?.participants ?? []}
          reactions={reactions}
          participantsMeta={participantsMeta}
          typingUserIds={typingUserIds}
          events={events}
          onReact={(messageId, kind) => void react(messageId, kind)}
          onReply={setReplyingTo}
          onUnsend={(msg) => void unsend(msg)}
          onEdit={(msg, text) => void edit(msg, text)}
        />
        <Composer
          vibe={vibe}
          onExpression={(e: Expression) => {
            void sendPayload(
              { kind: 'expression', id: e.id, text: e.text, effect: e.effect },
              { ephemeral: conversation?.vanish_mode ?? false },
            );
          }}
          replyingTo={replyingTo}
          replyName={
            replyingTo
              ? replyingTo.sender_id === userId
                ? 'You'
                : (conversation?.participants.find(
                    (p) => p.id === replyingTo.sender_id,
                  )?.display_name ?? '')
              : ''
          }
          onCancelReply={() => setReplyingTo(null)}
          onSend={(body) => {
            void send(body, {
              ephemeral: conversation?.vanish_mode ?? false,
              reply_to: replyingTo?.id ?? null,
            });
            setReplyingTo(null);
          }}
          onSendFile={async (file, viewOnce) => {
            const payload = await encryptAndUpload(file, id);
            await sendPayload(payload, {
              view_once: viewOnce,
              attachment_path: payload.path,
              ephemeral: conversation?.vanish_mode ?? false,
              reply_to: replyingTo?.id ?? null,
            });
            setReplyingTo(null);
          }}
          onTyping={sendTyping}
        />
      </div>

      <ChatDetails
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        conversation={conversation}
        me={userId}
      />

      <ThemePicker
        open={themeOpen}
        onOpenChange={setThemeOpen}
        conversation={conversation}
        onWallpaper={(theme) => actions.setWallpaper(theme)}
      />

      <AnimatePresence>
        {celebration && (
          <motion.div
            key={celebration.key}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Celebration kind={celebration.kind} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
