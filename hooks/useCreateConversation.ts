'use client';

import useSWRMutation from 'swr/mutation';
import { supabase } from '@/lib/supabase';

type Args = { otherUsernames: string[]; groupName?: string | null };

// Wraps the create_conversation RPC as an SWR mutation so components trigger it
// without touching the Supabase client directly. Returns the new conversation id.
export function useCreateConversation() {
  return useSWRMutation(
    'rpc/create_conversation',
    async (_key: string, { arg }: { arg: Args }) => {
      const { data, error } = await supabase.rpc('create_conversation', {
        other_usernames: arg.otherUsernames,
        group_name: arg.groupName ?? null,
      });
      if (error || !data) throw error ?? new Error('Could not create the conversation.');
      return data as string;
    },
  );
}
