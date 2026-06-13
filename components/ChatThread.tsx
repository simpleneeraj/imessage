'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { idb } from '@/lib/idb';
import { encryptAndUpload } from '@/lib/attachments';
import { useAuth } from './AuthProvider';
import { useMessages } from '@/lib/useMessages';
import type { Conversation, Message, Profile } from '@/lib/types';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import { OfflineBanner } from './OfflineBanner';
import { ChatDetails } from './ChatDetails';
import { ThemePicker } from './ThemePicker';
import { Celebration } from './Celebration';
import { LockScreen } from './LockScreen';
import { PasscodeDialog } from './PasscodeDialog';
import type { Expression } from '@/lib/expressions';
import MaskWallpaper from '@/plugins/mask-wallpaper';
import { parseWallpaper, wallpaperOptionsFor } from '@/utils/config';
import { bubbleSolid } from '@/utils/themes';
import { useEvents } from '@/lib/useEvents';

type ConversationRow = Omit<Conversation, 'participants'> & {
  conversation_participants: {
    user_id: string;
    nickname: string | null;
    passcode_hash: string | null;
    profiles: Profile;
  }[];
};

function useConversation(id: string, me: string): Conversation | null {
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
          '*, conversation_participants(user_id, nickname, passcode_hash, profiles(*))',
        )
        .eq('id', id)
        .maybeSingle()
        .then(({ data }) => {
          if (cancelled || !data) return;
          const { conversation_participants, ...conv } =
            data as ConversationRow;
          const fresh = {
            ...conv,
            // nicknames override display everywhere inside the chat
            participants: conversation_participants.map((p) => ({
              ...p.profiles,
              nickname: p.nickname,
              display_name: p.nickname ?? p.profiles.display_name,
            })),
            myPasscodeHash:
              conversation_participants.find((p) => p.user_id === me)
                ?.passcode_hash ?? null,
          };
          setConversation(fresh);
          void idb.putAll('conversations', [fresh]);
        });
    load();

    // vanish/vibe/wallpaper arrive as conversation UPDATEs; membership and
    // nickname changes arrive as audit-event INSERTs → refetch participants.
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
  }, [id, me]);

  return conversation;
}

// Outer gate: while a passcode lock is active, the message UI is NEVER
// mounted — no fetch, no decrypt, no composer — so stripping the lock screen
// from the DOM reveals nothing and can't send messages.
export function ChatThread({
  id,
  initialPasscodeHash = null,
  initialTitle = '',
}: {
  id: string;
  // Resolved server-side so a locked chat renders the LockScreen on first
  // paint; the client lookup below reconciles once the conversation loads.
  initialPasscodeHash?: string | null;
  initialTitle?: string;
}) {
  const { userId } = useAuth();
  const conversation = useConversation(id, userId);

  const [unlocked, setUnlocked] = useState(false);
  // local override so set/remove in this session applies without a refetch
  const [hashOverride, setHashOverride] = useState<string | null | undefined>(
    undefined,
  );
  const myPasscodeHash =
    hashOverride !== undefined
      ? hashOverride
      : conversation
        ? (conversation.myPasscodeHash ?? null)
        : initialPasscodeHash;
  const locked = Boolean(myPasscodeHash) && !unlocked;

  const others = conversation?.participants.filter((p) => p.id !== userId) ?? [];
  const title = !conversation
    ? initialTitle
    : conversation.is_group
      ? (conversation.name ?? `${others.length} People`)
      : (others[0]?.display_name ?? 'Chat');

  if (locked && myPasscodeHash) {
    return (
      <div className="relative flex h-full min-h-0 flex-col bg-(--imsg-chat-bg)">
        <LockScreen
          conversationId={id}
          passcodeHash={myPasscodeHash}
          title={title || 'This chat'}
          onUnlock={() => setUnlocked(true)}
        />
      </div>
    );
  }

  return (
    <ChatThreadInner
      id={id}
      userId={userId}
      conversation={conversation}
      myPasscodeHash={myPasscodeHash}
      onPasscodeChange={(hash) => {
        setHashOverride(hash);
        setUnlocked(true); // setting a code mustn't lock you out mid-session
      }}
    />
  );
}

function ChatThreadInner({
  id,
  userId,
  conversation,
  myPasscodeHash,
  onPasscodeChange,
}: {
  id: string;
  userId: string;
  conversation: Conversation | null;
  myPasscodeHash: string | null;
  onPasscodeChange: (hash: string | null) => void;
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

  const [passcodeOpen, setPasscodeOpen] = useState(false);

  // Celebrations: new expression messages fire a full-screen effect.
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
      // don't celebrate history on first load
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

  // Read receipts: mark on open, on refocus, and when new messages arrive
  // while the thread is visible. (Locked chats never mount this component.)
  useEffect(() => {
    if (document.visibilityState === 'visible') markRead();
    const onVisible = () => {
      if (document.visibilityState === 'visible') markRead();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [markRead, messages.length]);

  // Vanish mode: when the chat is closed (or the mode is turned off),
  // ephemeral messages that everyone has read are destroyed for everyone.
  const vanish = conversation?.vanish_mode ?? false;
  useEffect(() => {
    if (!vanish) return;
    const sweep = () => {
      if (navigator.onLine) {
        // .then() matters: supabase builders only execute when awaited
        void supabase.rpc('delete_vanished', { conv: id }).then(() => {});
      }
    };
    window.addEventListener('pagehide', sweep);
    return () => {
      window.removeEventListener('pagehide', sweep);
      sweep();
    };
  }, [vanish, id]);

  // Header action-menu state + handlers (moved out of ChatDetails).
  const isAdmin = conversation?.created_by === userId;
  const deleted = Boolean(conversation?.deleted_at);

  const toggleVanish = () =>
    void supabase
      .rpc('set_vanish_mode', { conv: id, enabled: !vanish })
      .then(() => {});

  const deleteForMe = () => {
    void supabase.rpc('hide_conversation', { conv: id }).then(() => {});
    router.push('/chats');
  };
  const deleteForEveryone = () => {
    void supabase
      .rpc('set_conversation_deleted', { conv: id, deleted: true })
      .then(() => {});
    router.push('/chats');
  };
  const restore = () =>
    void supabase
      .rpc('set_conversation_deleted', { conv: id, deleted: false })
      .then(() => {});

  const title = !conversation
    ? ''
    : conversation.is_group
      ? (conversation.name ?? `${others.length} People`)
      : (others[0]?.display_name ?? 'Chat');

  return (
    <div
      className={cn(
        'relative flex h-full min-h-0 flex-col bg-(--imsg-chat-bg) transition-colors duration-300',
        vanish && 'vanish',
        wallpaperOptions && 'has-wallpaper',
      )}
      // themed outgoing-bubble fill (solid or gradient); vanish keeps its own palette
      style={
        !vanish && bubbleColor
          ? ({
              '--imsg-bubble-out': bubbleSolid(bubbleColor),
              '--imsg-bubble-out-bg': bubbleColor,
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
          {/* Scrim: dims the busy pattern so bubbles stay readable. */}
          <div className="pointer-events-none absolute inset-0 z-0 bg-white/45 dark:bg-black/55" />
        </>
      )}
      {/* Foreground above the wallpaper layer. */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <ChatHeader
          title={title}
          others={others}
          conversationId={id}
          onOpenDetails={() => setDetailsOpen(true)}
          onOpenTheme={() => setThemeOpen(true)}
          onOpenPasscode={() => setPasscodeOpen(true)}
          hasPasscode={Boolean(myPasscodeHash)}
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
              className="shrink-0 overflow-hidden bg-linear-to-r from-[#3b2a6e] via-[#5e5ce6] to-[#3b2a6e] text-center"
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
          vibe={vibe}
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
        onWallpaper={(theme) => {
          // the conversations UPDATE event syncs the new theme to all members
          void supabase
            .rpc('set_wallpaper', { conv: id, theme })
            .then(() => {});
        }}
      />

      <PasscodeDialog
        open={passcodeOpen}
        onOpenChange={setPasscodeOpen}
        conversationId={id}
        hasPasscode={Boolean(myPasscodeHash)}
        onChanged={onPasscodeChange}
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
