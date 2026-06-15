'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  disablePush,
  enablePush,
  isPushEnabled,
  isPushSupported,
} from '@/lib/push';

// Manages this device's Web Push subscription state for the settings toggle.
export function usePush() {
  const [supported] = useState(isPushSupported);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported) return;
    void isPushEnabled().then(setEnabled);
  }, [supported]);

  const toggle = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (enabled) {
        await disablePush();
        setEnabled(false);
        return;
      }
      const result = await enablePush();
      if (result === 'ok') {
        setEnabled(true);
      } else if (typeof window !== 'undefined') {
        const msg =
          result === 'denied'
            ? 'Notifications are blocked. Tap the lock icon in your browser’s address bar → Site settings → allow Notifications, then try again.'
            : result === 'unsupported'
              ? 'This browser doesn’t support push notifications.'
              : result === 'no-vapid'
                ? 'Push isn’t configured (missing VAPID key in this build).'
                : 'Could not enable notifications. Please try again.';
        window.alert(msg);
      }
    } finally {
      setBusy(false);
    }
  }, [busy, enabled]);

  return { supported, enabled, busy, toggle };
}
