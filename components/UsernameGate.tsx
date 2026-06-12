"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldControl, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";

const USERNAME_RE = /^[a-zA-Z0-9_]{2,24}$/;

export function UsernameGate({
  userId,
  onCreated,
}: {
  userId: string;
  onCreated: (profile: Profile) => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = displayName.trim();
    if (!name) {
      setError("Please enter your name.");
      return;
    }
    if (!USERNAME_RE.test(username)) {
      setError("Username must be 2–24 letters, numbers or underscores.");
      return;
    }

    setSubmitting(true);
    setError("");
    const { data, error: insertError } = await supabase
      .from("profiles")
      .insert({ id: userId, username, display_name: name })
      .select()
      .single();
    setSubmitting(false);

    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "That username is already taken."
          : insertError.message
      );
      return;
    }
    onCreated(data as Profile);
  }

  return (
    <div className="flex h-dvh flex-col items-center justify-center bg-white px-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-20 items-center justify-center rounded-[22px] bg-gradient-to-b from-[#67e860] to-[#0fcc23] shadow-sm">
            <svg viewBox="0 0 24 24" className="size-11 fill-white">
              <path d="M12 3C6.48 3 2 6.92 2 11.75c0 2.75 1.46 5.2 3.73 6.8-.13 1.13-.6 2.25-1.45 3.15-.18.19-.04.5.22.47 1.99-.25 3.6-1.02 4.73-1.84.88.21 1.81.32 2.77.32 5.52 0 10-3.92 10-8.75S17.52 3 12 3z" />
            </svg>
          </div>
          <h1 className="text-[28px] font-bold tracking-tight">Messages</h1>
          <p className="text-[15px] text-imsg-text-gray">
            Pick a name and username to start chatting.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field name="displayName">
            <FieldLabel>Name</FieldLabel>
            <FieldControl
              render={
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Duncan Knox"
                  autoComplete="name"
                  maxLength={50}
                  autoFocus
                />
              }
            />
          </Field>

          <Field name="username">
            <FieldLabel>Username</FieldLabel>
            <FieldControl
              render={
                <Input
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))
                  }
                  placeholder="duncan_knox"
                  autoCapitalize="none"
                  autoCorrect="off"
                  maxLength={24}
                />
              }
            />
          </Field>

          {error && (
            <p role="alert" className="text-[13px] text-destructive">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="h-12 rounded-full bg-imsg-blue text-[17px] font-semibold text-white hover:bg-imsg-blue/90"
          >
            {submitting ? <Spinner className="size-5" /> : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
