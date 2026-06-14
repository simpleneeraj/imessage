'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IoChevronForward, IoCreateOutline, IoSearch } from 'react-icons/io5';
import { useAuth } from './AuthProvider';
import { useConversations } from '@/hooks/useConversations';
import { useSearch } from '@/hooks/useSearch';
import { listTime } from '@/lib/time';
import { getPreviews, onPreviewsChange, type Preview } from '@/lib/previews';
import type { Conversation } from '@/lib/types';
import { Avatar } from './Avatar';
import { OfflineBanner } from './OfflineBanner';
import { HeaderMenu } from './HeaderMenu';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import Logo from './logo';

function usePreviews(): Record<string, Preview> {
  const [previews, setPreviews] = useState<Record<string, Preview>>({});
  useEffect(() => {
    let mounted = true;
    const load = () =>
      void getPreviews().then((p) => {
        if (mounted) setPreviews(p);
      });
    load();
    const off = onPreviewsChange(load);
    return () => {
      mounted = false;
      off();
    };
  }, []);
  return previews;
}

function conversationTitle(conv: Conversation, me: string): string {
  const others = conv.participants.filter((p) => p.id !== me);
  if (conv.is_group) {
    return (
      conv.name ?? others.map((p) => p.display_name.split(' ')[0]).join(', ')
    );
  }
  return others[0]?.display_name ?? 'Chat';
}

function RowAvatar({ conv, me }: { conv: Conversation; me: string }) {
  const others = conv.participants.filter((p) => p.id !== me);
  if (conv.is_group && others.length > 1) {
    return (
      <div className="relative size-11.25 shrink-0">
        <Avatar
          name={others[0].display_name}
          size={32}
          className="absolute left-0 top-0"
        />
        <Avatar
          name={others[1].display_name}
          size={28}
          className="absolute bottom-0 right-0 ring-2 ring-background"
        />
      </div>
    );
  }
  return <Avatar name={others[0]?.display_name ?? '?'} size={45} />;
}

function Row({
  conv,
  me,
  preview,
  active,
}: {
  conv: Conversation;
  me: string;
  preview: string;
  active: boolean;
}) {
  const unread = Boolean(
    conv.last_message_at &&
    (!conv.myLastReadAt || conv.last_message_at > conv.myLastReadAt),
  );
  const deletedForAll = Boolean(conv.deleted_at);
  return (
    <Link
      href={`/chat/${conv.id}`}
      className={cn(
        'flex cursor-pointer items-center gap-3 pl-4 transition-colors hover:bg-muted/40 active:bg-muted/50',
        active && 'md:bg-muted/60',
        deletedForAll && 'opacity-50',
      )}
    >
      <span className="flex w-2.5 shrink-0 justify-center">
        {unread && (
          <span
            className="size-2.5 rounded-full bg-primary"
            aria-label="Unread"
          />
        )}
      </span>
      <RowAvatar conv={conv} me={me} />
      <div className="hairline-b flex min-w-0 flex-1 items-start justify-between gap-2 py-2.5 pr-3">
        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold leading-5.5">
            {conversationTitle(conv, me)}
            {deletedForAll && (
              <span className="ml-1 text-[13px] font-normal text-muted-foreground">
                (deleted)
              </span>
            )}
          </p>
          <p className="line-clamp-2 text-[15px] leading-5 text-muted-foreground">
            {preview}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 pt-0.5 text-[15px] text-muted-foreground">
          {listTime(conv.last_message_at ?? conv.created_at)}
          <IoChevronForward className="size-3.5 text-ring" />
        </span>
      </div>
    </Link>
  );
}

export function ConversationList() {
  const { userId } = useAuth();
  const { conversations, loading } = useConversations(userId);
  const previews = usePreviews();
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const hits = useSearch(query, conversations, userId);
  const searching = query.trim().length >= 2;

  const parts = [
    { text: 'fest', className: 'font-light' },
    { text: 'hub', className: 'font-semibold' },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="shrink-0 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <h1 className="text-[34px] font-bold font-heading tracking-tight">
            <Logo parts={parts} />
          </h1>
          <div className="flex items-center">
            <HeaderMenu />
            <Link
              href="/new"
              aria-label="New message"
              className="flex size-11 items-center justify-center text-primary active:opacity-60"
            >
              <IoCreateOutline className="size-6" />
            </Link>
          </div>
        </div>
        <div className="relative pb-2 pt-1">
          <IoSearch className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-2.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="h-9 w-full rounded-[10px] bg-muted/70 pl-8 pr-3 text-[17px] outline-none placeholder:text-muted-foreground"
          />
        </div>
      </header>

      <OfflineBanner />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {searching ? (
          hits.length === 0 ? (
            <p className="px-4 py-10 text-center text-[15px] text-muted-foreground">
              {`No results for "${query.trim()}"`}
            </p>
          ) : (
            hits.map(({ conversation, snippet }) => (
              <Row
                key={conversation.id}
                conv={conversation}
                me={userId}
                preview={
                  snippet ??
                  previews[conversation.id]?.text ??
                  'Matched conversation'
                }
                active={pathname === `/chat/${conversation.id}`}
              />
            ))
          )
        ) : loading && conversations.length === 0 ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-6 text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-8 py-16 text-center">
            <p className="text-[17px] font-semibold">No Messages</p>
            <p className="text-[15px] text-muted-foreground">
              Tap the compose button to start a conversation by username.
            </p>
          </div>
        ) : (
          conversations.map((conv) => (
            <Row
              key={conv.id}
              conv={conv}
              me={userId}
              preview={
                previews[conv.id]?.text ??
                (conv.last_message_at ? 'Message' : 'No messages yet')
              }
              active={pathname === `/chat/${conv.id}`}
            />
          ))
        )}
      </div>
    </div>
  );
}
