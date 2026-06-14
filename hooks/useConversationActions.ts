'use client';

import { useMemo } from 'react';
import { supabase } from '@/lib/supabase';

// Fire-and-forget conversation RPCs, bound to one conversation id. These mutate
// server state that flows back through the realtime conversation subscription,
// so there's no local cache to update — the hook just centralises the calls so
// components don't reach for the Supabase client directly.
export function useConversationActions(conversationId: string) {
  return useMemo(() => {
    const rpc = (fn: string, args: Record<string, unknown>) =>
      supabase.rpc(fn, args).then(() => {});

    return {
      deleteVanished: () =>
        void rpc('delete_vanished', { conv: conversationId }),
      hideConversation: () =>
        void rpc('hide_conversation', { conv: conversationId }),
      setVanishMode: (enabled: boolean) =>
        void rpc('set_vanish_mode', { conv: conversationId, enabled }),
      setDeleted: (deleted: boolean) =>
        void rpc('set_conversation_deleted', { conv: conversationId, deleted }),
      setWallpaper: (theme: string | null) =>
        void rpc('set_wallpaper', { conv: conversationId, theme }),
    };
  }, [conversationId]);
}
