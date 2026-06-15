'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { supabase } from '@/lib/supabase';
import { idb } from '@/lib/idb';
import { wireOutbox } from '@/lib/outbox';
import { getPrivateKey } from '@/lib/keys';
import { refreshPushSubscription } from '@/lib/push';
import { signOut } from '@/lib/auth';
import type { Profile } from '@/lib/types';
import { AuthGate } from './AuthGate';
import { Spinner } from '@/components/ui/spinner';

type AuthContextValue = {
  userId: string;
  profile: Profile;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [phase, setPhase] = useState<'loading' | 'gate' | 'ready'>('loading');

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (!cancelled) setPhase('gate');
        return;
      }

      // A session without the local private key can't decrypt anything —
      // the password (→ encKey) is needed to restore the backup, so re-auth.
      const [localProfile, privateKey] = await Promise.all([
        idb.kvGet<Profile>('profile'),
        getPrivateKey(),
      ]);
      if (cancelled) return;

      if (localProfile && localProfile.id === session.user.id && privateKey) {
        await supabase.realtime.setAuth();
        setProfile(localProfile);
        setPhase('ready');
        // Re-mint a fresh push subscription so a device whose endpoint expired
        // (410) silently recovers on reopen instead of staying dark.
        void refreshPushSubscription();
      } else {
        await supabase.auth.signOut();
        setPhase('gate');
      }
    }

    void bootstrap();
    wireOutbox();

    // Register the push-only service worker (background notifications). It does
    // no caching, so first clear any caches left by the old PWA caching worker —
    // otherwise stale /_next chunks keep getting served.
    if ('serviceWorker' in navigator) {
      if ('caches' in window) {
        void caches
          .keys()
          .then((keys) => keys.forEach((k) => void caches.delete(k)));
      }
      void navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const handleReady = useCallback((p: Profile) => {
    setProfile(p);
    setPhase('ready');
  }, []);

  const logout = useCallback(async () => {
    await signOut();
  }, []);

  // Auto sign-out after 5 minutes of inactivity (only once signed in).
  // useInactivityLogout(phase === "ready", () => void signOut());

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setProfile((cur) => {
      if (!cur) return cur;
      const next = { ...cur, ...patch };
      void idb.kvSet('profile', next);
      return next;
    });
  }, []);

  if (phase === 'loading') {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  if (phase === 'gate') {
    return <AuthGate onReady={handleReady} />;
  }

  if (!profile) return null;

  return (
    <AuthContext.Provider
      value={{ userId: profile.id, profile, logout, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}
