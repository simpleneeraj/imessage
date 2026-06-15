'use client';

import useSWRMutation from 'swr/mutation';
import { supabase } from '@/lib/supabase';

// Wraps the mark_attachment_viewed RPC (view-once attachments).
export function useMarkAttachmentViewed() {
  return useSWRMutation(
    'rpc/mark_attachment_viewed',
    async (_key: string, { arg }: { arg: { messageId: string } }) => {
      const { error } = await supabase.rpc('mark_attachment_viewed', {
        msg: arg.messageId,
      });
      if (error) throw error;
    },
  );
}
