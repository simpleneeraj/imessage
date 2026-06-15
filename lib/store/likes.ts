import { atomWithStorage } from 'jotai/utils';

// Which quotes this device has liked, persisted to localStorage (keyed by quote
// id). atomWithStorage defers reading storage until after mount, so SSR and the
// first client render agree (no hydration mismatch).
export const likedQuotesAtom = atomWithStorage<Record<string, boolean>>(
  'liked-quotes',
  {},
);
