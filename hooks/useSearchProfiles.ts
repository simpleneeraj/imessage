'use client';

import { useQuery } from '@supabase-cache-helpers/postgrest-swr';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

// Username prefix search for starting a new chat. Read-only request/response
// query cached by cache-helpers (no realtime needed). Pass a debounced term.
export function useSearchProfiles(term: string, excludeUserId: string | null) {
  return useQuery<Profile>(
    term.length >= 2 && excludeUserId
      ? supabase
          .from('profiles')
          .select('*')
          .ilike('username', `${term}%`)
          .neq('id', excludeUserId)
          .not('public_key', 'is', null)
          .limit(8)
      : null,
  );
}
