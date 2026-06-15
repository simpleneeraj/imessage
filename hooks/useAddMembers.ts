'use client';

import useSWRMutation from 'swr/mutation';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

type Args = { conversationId: string; usernames: string[] };

// Wraps the add_members RPC. Returns the newly added member profiles so the
// caller can grant them the conversation key.
export function useAddMembers() {
  return useSWRMutation(
    'rpc/add_members',
    async (_key: string, { arg }: { arg: Args }) => {
      const { data, error } = await supabase.rpc('add_members', {
        conv: arg.conversationId,
        usernames: arg.usernames,
      });
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  );
}
