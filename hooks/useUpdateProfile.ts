'use client';

import { useUpdateMutation } from '@supabase-cache-helpers/postgrest-swr';
import { supabase } from '@/lib/supabase';

// Update your own profile (display name, mood) through a cache-helpers
// mutation, keyed on the row id so any cached profile query revalidates.
export function useUpdateProfile() {
  return useUpdateMutation(
    supabase.from('profiles'),
    ['id'],
    'id, username, display_name, public_key, mood',
  );
}
