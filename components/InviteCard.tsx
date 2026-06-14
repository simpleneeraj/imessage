'use client';

import { useEffect, useState } from 'react';
import {
  IoCheckmarkCircle,
  IoCopyOutline,
  IoPersonAddOutline,
  IoShareOutline,
} from 'react-icons/io5';
import { supabase } from '@/lib/supabase';
import { inviteUrl } from '@/lib/tenant';
import { Spinner } from '@/components/ui/spinner';

type InviteRow = { slug: string; token: string; used: boolean };

export function InviteCard({ fallback }: { fallback: React.ReactNode }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [canShare] = useState(
    () => typeof navigator !== 'undefined' && 'share' in navigator,
  );

  useEffect(() => {
    let on = true;
    void supabase.rpc('get_invite').then(({ data }) => {
      if (!on) return;
      const row = (Array.isArray(data) ? data[0] : data) as InviteRow | undefined;
      setUrl(row && !row.used ? inviteUrl(row.slug, row.token) : null);
      setLoading(false);
    });
    return () => {
      on = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }
  if (!url) return <>{fallback}</>;

  const copy = () => {
    void navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const share = () => {
    void navigator.share?.({ title: 'Join my space', url }).catch(() => {});
  };

  return (
    <div className="mx-auto mt-10 flex max-w-sm flex-col items-center gap-4 px-8 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <IoPersonAddOutline className="size-7" />
      </span>
      <div>
        <p className="text-[17px] font-semibold">Invite the other person</p>
        <p className="mt-1 text-[15px] text-muted-foreground">
          This space is just for the two of you. Send them this private link to
          join.
        </p>
      </div>

      <button
        type="button"
        onClick={copy}
        title="Copy invite link"
        className="w-full truncate rounded-[12px] border border-ring/60 bg-muted/40 px-3 py-2.5 text-[13px] text-muted-foreground active:opacity-70"
      >
        {url}
      </button>

      <div className="flex w-full gap-2">
        <button
          type="button"
          onClick={copy}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[15px] font-semibold text-white active:opacity-80"
        >
          {copied ? (
            <>
              <IoCheckmarkCircle className="size-5" />
              Copied
            </>
          ) : (
            <>
              <IoCopyOutline className="size-5" />
              Copy link
            </>
          )}
        </button>
        {canShare && (
          <button
            type="button"
            onClick={share}
            aria-label="Share invite link"
            className="flex items-center justify-center gap-2 rounded-full bg-muted px-4 py-2.5 text-[15px] font-semibold active:opacity-70"
          >
            <IoShareOutline className="size-5" />
            Share
          </button>
        )}
      </div>
    </div>
  );
}
