"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import { idb } from "@/lib/idb";
import { wireOutbox } from "@/lib/outbox";
import type { Profile } from "@/lib/types";
import { UsernameGate } from "./UsernameGate";
import { Spinner } from "@/components/ui/spinner";

type AuthContextValue = {
  userId: string;
  profile: Profile;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [phase, setPhase] = useState<"loading" | "gate" | "ready" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        let {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) throw error;
          session = data.session;
        }
        if (!session) throw new Error("Could not establish a session");
        if (cancelled) return;

        const uid = session.user.id;
        setUserId(uid);
        // Make sure the realtime connection carries the auth token so
        // RLS-filtered postgres_changes events are delivered.
        await supabase.realtime.setAuth();

        const cached = await idb.kvGet<Profile>("profile");
        if (cached && cached.id === uid && !cancelled) {
          setProfile(cached);
          setPhase("ready");
        }

        const { data: row, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", uid)
          .maybeSingle();
        if (cancelled) return;

        if (row) {
          setProfile(row as Profile);
          setPhase("ready");
          void idb.kvSet("profile", row);
        } else if (!profileError && !cached) {
          setPhase("gate");
        } else if (profileError && !cached) {
          // Offline with no cached profile — nothing to render yet.
          throw new Error(
            "Could not load your profile. Check your connection and reload."
          );
        }
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(err instanceof Error ? err.message : String(err));
        setPhase("error");
      }
    }

    void bootstrap();
    wireOutbox();

    if (
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator
    ) {
      void navigator.serviceWorker.register("/sw.js", {
        updateViaCache: "none",
      });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const handleProfileCreated = useCallback((created: Profile) => {
    setProfile(created);
    setPhase("ready");
    void idb.kvSet("profile", created);
  }, []);

  if (phase === "loading") {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Spinner className="size-6 text-imsg-text-gray" />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-2 px-8 text-center">
        <p className="text-[17px] font-semibold">Something went wrong</p>
        <p className="text-[15px] text-imsg-text-gray">{errorMessage}</p>
      </div>
    );
  }

  if (phase === "gate" && userId) {
    return <UsernameGate userId={userId} onCreated={handleProfileCreated} />;
  }

  if (!userId || !profile) return null;

  return (
    <AuthContext.Provider value={{ userId, profile }}>
      {children}
    </AuthContext.Provider>
  );
}
