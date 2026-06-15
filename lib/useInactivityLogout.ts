'use client';

import { useEffect, useRef } from 'react';

const COOKIE = 'fh_last_active';
const TIMEOUT_MS = 5 * 60 * 1000; // auto sign-out after 5 min idle
const CHECK_MS = 15 * 1000; // how often the idle timer re-checks
const ACTIVITY_EVENTS = [
  'pointerdown',
  'keydown',
  'touchstart',
  'scroll',
] as const;

function readLastActive(): number {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE}=(\\d+)`),
  );
  return match ? Number(match[1]) : 0;
}

function writeLastActive(ts: number) {
  // Session cookie (no Max-Age) so it dies when the browser fully closes; the
  // timestamp itself enforces the 5-minute idle window while open.
  document.cookie = `${COOKIE}=${ts}; path=/; SameSite=Lax`;
}

// Signs the user out after 5 minutes without interaction. The last-active time
// lives in a cookie so the window is enforced across reloads and tab switches,
// not just within a single mounted timer.
export function useInactivityLogout(
  enabled: boolean,
  onTimeout: () => void,
): void {
  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  });

  useEffect(() => {
    if (!enabled) return;

    // If the session was already idle past the window before this mounted
    // (e.g. the tab was reopened), sign out immediately.
    const last = readLastActive();
    if (last && Date.now() - last > TIMEOUT_MS) {
      onTimeoutRef.current();
      return;
    }

    let fired = false;
    const bump = () => {
      if (fired) return;
      writeLastActive(Date.now());
    };
    bump();

    const check = () => {
      if (fired) return;
      const lastActive = readLastActive();
      if (lastActive && Date.now() - lastActive > TIMEOUT_MS) {
        fired = true;
        onTimeoutRef.current();
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };

    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, bump, { passive: true }),
    );
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    const interval = window.setInterval(check, CHECK_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, bump));
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
      window.clearInterval(interval);
    };
  }, [enabled]);
}
