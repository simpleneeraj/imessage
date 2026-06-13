'use client';

import { useCallback, useEffect, useState } from 'react';
import { IoPersonAdd, IoCloseCircle, IoPencil } from 'react-icons/io5';
import {
  Drawer,
  DrawerHeader,
  DrawerPopup,
  DrawerTitle,
} from '@/components/ui/drawer';
import { supabase } from '@/lib/supabase';
import { grantConvKey } from '@/lib/keys';
import type { Conversation, Profile } from '@/lib/types';
import { Avatar } from './Avatar';
import { useIsDesktop } from '@/lib/useIsDesktop';
import { cn } from '@/lib/utils';

// User management: members + reaction sets. Theming lives in ThemePicker.
export function ChatDetails({
  open,
  onOpenChange,
  conversation,
  me,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation | null;
  me: string;
}) {
  const [members, setMembers] = useState<Profile[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [busy, setBusy] = useState(false);
  const isDesktop = useIsDesktop();

  // nickname editing
  const [editingNick, setEditingNick] = useState<string | null>(null);
  const [nickValue, setNickValue] = useState('');

  const convId = conversation?.id;
  const isAdmin = conversation?.created_by === me;

  const refreshMembers = useCallback(async () => {
    if (!convId) return;
    const { data } = await supabase
      .from('conversation_participants')
      .select('nickname, profiles(*)')
      .eq('conversation_id', convId);
    if (data)
      setMembers(
        (
          data as unknown as { nickname: string | null; profiles: Profile }[]
        ).map((r) => ({ ...r.profiles, nickname: r.nickname })),
      );
  }, [convId]);

  async function saveNickname(target: string) {
    if (!convId) return;
    await supabase
      .rpc('set_nickname', { conv: convId, target, nick: nickValue })
      .then(() => {});
    setEditingNick(null);
    await refreshMembers();
  }

  useEffect(() => {
    // setMembers runs only after the awaited fetch resolves, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) void refreshMembers();
  }, [open, refreshMembers]);

  useEffect(() => {
    const term = query.trim();
    const t = setTimeout(
      async () => {
        if (term.length < 2 || !convId) {
          setResults([]);
          return;
        }
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', `${term}%`)
          .not('public_key', 'is', null)
          .limit(6);
        const existing = new Set(members.map((m) => m.id));
        setResults(
          ((data as Profile[]) ?? []).filter((p) => !existing.has(p.id)),
        );
      },
      term.length < 2 ? 0 : 200,
    );
    return () => clearTimeout(t);
  }, [query, convId, members]);

  async function addMember(p: Profile) {
    if (!convId || busy) return;
    setBusy(true);
    const { data, error } = await supabase.rpc('add_members', {
      conv: convId,
      usernames: [p.username],
    });
    if (!error && data) {
      for (const added of data as Profile[]) {
        await grantConvKey(convId, added, me);
      }
      setQuery('');
      setResults([]);
      await refreshMembers();
    }
    setBusy(false);
  }

  async function removeMember(userId: string) {
    if (!convId || busy) return;
    setBusy(true);
    await supabase
      .rpc('remove_member', { conv: convId, target: userId })
      .then(() => {});
    await refreshMembers();
    setBusy(false);
  }

  const others = members.filter((m) => m.id !== me);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      position={isDesktop ? 'right' : 'bottom'}
    >
      <DrawerPopup
        variant="inset"
        showBar={!isDesktop}
        className={cn('flex flex-col', isDesktop ? 'h-full' : 'max-h-[88dvh]')}
      >
        <DrawerHeader>
          <DrawerTitle>Chat Info</DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-1 flex-col gap-7 overflow-y-auto px-6 pb-8">
          {/* Members */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              {others.length + 1} People
            </h3>
            <ul className="flex flex-col gap-1">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-1">
                  <Avatar name={m.nickname ?? m.display_name} size={36} />
                  {editingNick === m.id ? (
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <input
                        value={nickValue}
                        onChange={(e) => setNickValue(e.target.value)}
                        placeholder={m.display_name}
                        maxLength={32}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void saveNickname(m.id);
                          if (e.key === 'Escape') setEditingNick(null);
                        }}
                        className="min-w-0 flex-1 rounded-lg border border-imsg-blue/50 bg-transparent px-2 py-1 text-[15px] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => void saveNickname(m.id)}
                        className="cursor-pointer text-[14px] font-semibold text-imsg-blue"
                      >
                        Save
                      </button>
                    </span>
                  ) : (
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">
                        {m.nickname ?? m.display_name}
                        {m.id === conversation?.created_by && (
                          <span className="ml-1.5 text-[12px] text-imsg-text-gray">
                            Admin
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-[13px] text-muted-foreground">
                        {m.nickname ? `${m.display_name} · ` : ''}@{m.username}
                        {m.mood ? ` · ${m.mood}` : ''}
                      </span>
                    </span>
                  )}
                  {editingNick !== m.id && (
                    <button
                      type="button"
                      aria-label={`Set nickname for ${m.display_name}`}
                      onClick={() => {
                        setEditingNick(m.id);
                        setNickValue(m.nickname ?? '');
                      }}
                      className="cursor-pointer text-imsg-text-gray active:opacity-60"
                    >
                      <IoPencil className="size-4.5" />
                    </button>
                  )}
                  {isAdmin && m.id !== me && (
                    <button
                      type="button"
                      aria-label={`Remove ${m.display_name}`}
                      onClick={() => void removeMember(m.id)}
                      className="cursor-pointer text-destructive active:opacity-60"
                    >
                      <IoCloseCircle className="size-6" />
                    </button>
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-3 flex items-center gap-2 rounded-xl border border-border px-3 py-2">
              <IoPersonAdd className="size-4 text-imsg-text-gray" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value.toLowerCase())}
                placeholder="Add people by username"
                autoCapitalize="none"
                autoCorrect="off"
                className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
              />
            </div>
            {results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => void addMember(p)}
                disabled={busy}
                className="mt-1 flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-imsg-gray/40"
              >
                <Avatar name={p.display_name} size={32} />
                <span className="min-w-0">
                  <span className="block truncate text-[15px]">
                    {p.display_name}
                  </span>
                  <span className="block truncate text-[13px] text-muted-foreground">
                    @{p.username}
                  </span>
                </span>
              </button>
            ))}
          </section>
        </div>
      </DrawerPopup>
    </Drawer>
  );
}
