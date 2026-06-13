'use client';

import { SWRConfig } from 'swr';

// App-wide SWR defaults for the request/response reads handled by
// @supabase-cache-helpers (e.g. NewChat user search). Security notes:
//  - The cache is the default IN-MEMORY store (no localStorage provider), so
//    nothing is persisted to disk and it is wiped on reload. Logout does a full
//    page navigation (signOut → window.location), so the cache never survives
//    an account switch.
//  - Every cached query still goes through PostgREST with the user's JWT, so RLS
//    (incl. the tenant-isolation policy) applies to cache fills exactly as to a
//    direct fetch — caching can't widen what a user is allowed to read.
export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        dedupingInterval: 2000,
        keepPreviousData: true,
        shouldRetryOnError: false,
      }}
    >
      {children}
    </SWRConfig>
  );
}
