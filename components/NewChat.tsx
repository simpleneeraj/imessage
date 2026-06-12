"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";
import type { Profile } from "@/lib/types";
import { Avatar } from "./Avatar";
import { Spinner } from "@/components/ui/spinner";

export function NewChat() {
  const { userId } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Profile[]>([]);
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const term = query.trim();
    const timer = setTimeout(
      async () => {
        if (term.length < 2) {
          setResults([]);
          return;
        }
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .ilike("username", `${term}%`)
          .neq("id", userId)
          .limit(8);
        setResults((data as Profile[]) ?? []);
      },
      term.length < 2 ? 0 : 200
    );
    return () => clearTimeout(timer);
  }, [query, userId]);

  function addRecipient(profile: Profile) {
    if (!selected.some((p) => p.id === profile.id)) {
      setSelected([...selected, profile]);
    }
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  }

  async function create() {
    if (selected.length === 0 || creating) return;
    setCreating(true);
    setError("");
    const { data, error: rpcError } = await supabase.rpc("create_conversation", {
      other_usernames: selected.map((p) => p.username),
      group_name: selected.length > 1 ? groupName.trim() || null : null,
    });
    if (rpcError || !data) {
      setCreating(false);
      setError(rpcError?.message ?? "Could not create the conversation.");
      return;
    }
    router.replace(`/chat/${data as string}`);
  }

  return (
    <div className="flex h-dvh flex-col bg-white">
      <header className="hairline-b shrink-0 bg-imsg-bar/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto grid w-full max-w-2xl grid-cols-[1fr_auto_1fr] items-center px-4 py-3">
          <Link href="/" className="justify-self-start text-[17px] text-imsg-blue active:opacity-60">
            Cancel
          </Link>
          <h1 className="text-[17px] font-semibold">New Message</h1>
          <button
            type="button"
            onClick={() => void create()}
            disabled={selected.length === 0 || creating}
            className="justify-self-end text-[17px] font-semibold text-imsg-blue disabled:text-imsg-text-gray active:opacity-60"
          >
            {creating ? <Spinner className="size-5" /> : "Chat"}
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto">
        <div className="hairline-b flex flex-wrap items-center gap-1.5 px-4 py-2.5">
          <span className="text-[15px] text-imsg-text-gray">To:</span>
          {selected.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(selected.filter((s) => s.id !== p.id))}
              className="rounded-full bg-imsg-blue/10 px-2.5 py-0.5 text-[15px] text-imsg-blue active:opacity-60"
            >
              {p.display_name}
            </button>
          ))}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value.toLowerCase())}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && query === "" && selected.length > 0) {
                setSelected(selected.slice(0, -1));
              }
              if (e.key === "Enter" && results.length > 0) {
                e.preventDefault();
                addRecipient(results[0]);
              }
            }}
            placeholder={selected.length === 0 ? "Search by username" : ""}
            autoCapitalize="none"
            autoCorrect="off"
            autoFocus
            className="min-w-[120px] flex-1 bg-transparent py-1 text-[17px] outline-none placeholder:text-imsg-text-gray"
          />
        </div>

        {selected.length > 1 && (
          <div className="hairline-b flex items-center gap-2 px-4 py-2.5">
            <span className="text-[15px] text-imsg-text-gray">Group name:</span>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Optional"
              maxLength={50}
              className="flex-1 bg-transparent py-1 text-[17px] outline-none placeholder:text-imsg-text-gray"
            />
          </div>
        )}

        {error && <p className="px-4 py-3 text-[15px] text-destructive">{error}</p>}

        <ul>
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => addRecipient(p)}
                className="flex w-full items-center gap-3 px-4 py-2 text-left active:bg-imsg-gray/50"
              >
                <Avatar name={p.display_name} size={40} />
                <span className="hairline-b flex min-w-0 flex-1 flex-col py-1">
                  <span className="truncate text-[17px]">{p.display_name}</span>
                  <span className="truncate text-[14px] text-imsg-text-gray">
                    @{p.username}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {query.trim().length >= 2 && results.length === 0 && (
            <li className="px-4 py-6 text-center text-[15px] text-imsg-text-gray">
              No one found for “{query.trim()}”
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
