"use client";

import Link from "next/link";
import type { Profile } from "@/lib/types";
import { Avatar } from "./Avatar";

export function ChatHeader({
  title,
  others,
}: {
  title: string;
  others: Profile[];
}) {
  const shown = others.slice(0, 2);

  return (
    <header className="hairline-b shrink-0 bg-imsg-bar/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto grid w-full max-w-2xl grid-cols-[44px_1fr_44px] items-center px-2 pb-1.5 pt-1">
        <Link
          href="/"
          aria-label="Back to conversations"
          className="flex h-11 items-center justify-start pl-1 text-imsg-blue active:opacity-60"
        >
          <svg viewBox="0 0 24 24" className="size-[26px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>

        <div className="flex flex-col items-center gap-1">
          {shown.length > 1 ? (
            <div className="flex h-12 items-center">
              <Avatar name={shown[0].display_name} size={40} className="ring-2 ring-imsg-bar" />
              <Avatar
                name={shown[1].display_name}
                size={32}
                className="-ml-3 mt-3 ring-2 ring-imsg-bar"
              />
            </div>
          ) : (
            <Avatar name={shown[0]?.display_name ?? "?"} size={44} />
          )}
          <span className="flex max-w-[200px] items-center gap-0.5 text-[12px] leading-none text-black">
            <span className="truncate">{title}</span>
            <svg viewBox="0 0 24 24" className="size-3 shrink-0 text-imsg-chevron" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>

        <button
          type="button"
          aria-label="Video call"
          className="flex h-11 items-center justify-end pr-1 text-imsg-blue active:opacity-60"
        >
          <svg viewBox="0 0 24 24" className="size-[26px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2.5" y="6.5" width="13" height="11" rx="3" />
            <path d="M15.5 10.5l4.5-3v9l-4.5-3z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
