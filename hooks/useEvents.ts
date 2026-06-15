'use client';

import {
  useQuery,
  useSubscription,
} from '@supabase-cache-helpers/postgrest-swr';
import { supabase } from '@/lib/supabase';
import type { ConversationEvent } from '@/lib/types';

// Audit-trail events (member added/removed/left, etc.) for a conversation.
// Read through cache-helpers' useQuery; kept live via useSubscription, which
// writes inserted rows straight into that query's cache. These rows are
// plaintext, so no client-side decryption is needed (unlike messages).
export function useEvents(
  conversationId: string,
  userId: string | null,
): ConversationEvent[] {
  const { data } = useQuery<ConversationEvent>(
    userId
      ? supabase
          .from('conversation_events')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
      : null,
  );

  useSubscription(
    userId ? supabase : null,
    `events:${conversationId}`,
    {
      event: '*',
      schema: 'public',
      table: 'conversation_events',
      filter: `conversation_id=eq.${conversationId}`,
    },
    ['id'],
  );

  return data ?? [];
}
