'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAtom } from 'jotai';
import { IoHeart, IoHeartOutline, IoMailOutline, IoSearch } from 'react-icons/io5';
import { motion } from 'motion/react';
import Logo from './logo';
import { GetTheApp } from './GetTheApp';
import { siteConfig } from '@/lib/site-config';
import { likedQuotesAtom } from '@/lib/store/likes';
import { likeCount, type Quote } from '@/lib/quotes-data';
import type { QuotesData } from '@/lib/quotes/sources';
import pkg from '@/package.json';

// Public face of the app: a Goodreads-style quotes page. Quotes are aggregated
// server-side (SSR) and passed in. The chat is reachable only via the secret
// door: type the unlock phrase into the newsletter box.

const fmt = (n: number) => n.toLocaleString('en-US');
const UNLOCK = (
  process.env.NEXT_PUBLIC_UNLOCK_PHRASE ?? 'our secret'
).toLowerCase();

const quoteId = (q: Quote) => q.author + q.text.slice(0, 16);

function LikeButton({
  liked,
  onToggle,
}: {
  liked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={liked}
      className="flex shrink-0 items-center gap-1 rounded-md border border-[#d6cdb8] bg-[#f9f7f1] px-2.5 py-1 text-[12px] font-semibold text-[#382110] transition-colors hover:bg-[#efe9da] active:scale-95"
    >
      {liked ? (
        <IoHeart className="size-3.5 text-rose-500" />
      ) : (
        <IoHeartOutline className="size-3.5" />
      )}
      Like
    </button>
  );
}

function QuoteCard({
  quote,
  liked,
  onToggle,
}: {
  quote: Quote;
  liked: boolean;
  onToggle: () => void;
}) {
  const base = likeCount(quote.text);
  return (
    <article className="rounded-md border border-[#e6e0cf] bg-white p-5 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <blockquote className="font-quote whitespace-pre-line text-[17px] leading-[1.7] text-[#382110]">
          &ldquo;{quote.text}&rdquo;
        </blockquote>
        <LikeButton liked={liked} onToggle={onToggle} />
      </div>
      <p className="font-quote mt-3 text-[14px] text-[#7a6a55]">
        ― <span className="font-semibold text-[#00635d]">{quote.author}</span>
      </p>
      {quote.tags.length > 0 && (
        <p className="mt-2 text-[12px] leading-5 text-[#9b8e79]">
          tags:{' '}
          {quote.tags.map((t, i) => (
            <span key={t}>
              <span className="text-[#00635d]">{t}</span>
              {i < quote.tags.length - 1 ? ', ' : ''}
            </span>
          ))}
        </p>
      )}
      <p className="mt-2 text-[12px] font-semibold text-[#7a6a55]">
        {fmt(base + (liked ? 1 : 0))} likes
      </p>
    </article>
  );
}

export function LoveQuotes({ data }: { data: QuotesData }) {
  const router = useRouter();
  const [active, setActive] = useState(data.categoryNames[0] ?? 'Love');
  const [query, setQuery] = useState('');
  const [liked, setLiked] = useAtom(likedQuotesAtom);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const toggle = (id: string) => setLiked((m) => ({ ...m, [id]: !m[id] }));

  const term = query.trim().toLowerCase();
  let list: Quote[];
  if (term) {
    const seen = new Set<string>();
    list = Object.values(data.categories)
      .flat()
      .filter((q) => {
        const id = quoteId(q);
        if (seen.has(id)) return false;
        seen.add(id);
        return (
          q.text.toLowerCase().includes(term) ||
          q.author.toLowerCase().includes(term) ||
          q.tags.some((t) => t.includes(term))
        );
      });
  } else {
    list = data.categories[active] ?? [];
  }

  // Secret door: type the unlock phrase into the newsletter box → open chat.
  function tryUnlock() {
    if (email.trim().toLowerCase() === UNLOCK) {
      router.push('/chats');
      return;
    }
    setSubscribed(true);
    setEmail('');
  }

  // Double-tap logo secretly redirects to chats, single tap scrolls to top
  const lastTapRef = useRef(0);
  function handleLogoTap() {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      router.push('/chats');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    lastTapRef.current = now;
  }

  return (
    <div className="min-h-dvh bg-[#f4f1ea] text-[#382110]">
      {/* Masthead */}
      <header className="sticky top-0 z-10 border-b border-[#e0d8c4] bg-[#f4f1ea]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <motion.span
            onClick={handleLogoTap}
            className="cursor-pointer select-none"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <Logo size="lg" parts={[...siteConfig.logoParts]} />
          </motion.span>
          <div className="ml-auto flex min-w-0 flex-1 items-center gap-2 rounded-md border border-[#d6cdb8] bg-white px-2.5 py-1.5 sm:max-w-xs">
            <IoSearch className="size-4 shrink-0 text-[#9b8e79]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search quotes"
              className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#b3a78f]"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-16 pt-5">
        {/* Quote of the Day */}
        <section className="mb-6">
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.18em] text-[#9b8e79]">
            Quote of the Day
          </h2>
          <article className="rounded-md border border-[#d8b24a]/40 bg-linear-to-b from-[#fbf4df] to-white p-6">
            <blockquote className="font-quote text-[20px] leading-[1.6] text-[#382110]">
              &ldquo;{data.qotd.text}&rdquo;
            </blockquote>
            <p className="mt-3 text-[14px] font-semibold text-[#00635d]">
              ― {data.qotd.author}
            </p>
          </article>
        </section>

        {/* Categories */}
        <nav className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
          {data.categoryNames.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setActive(c);
                setQuery('');
              }}
              className={
                'shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ' +
                (active === c && !term
                  ? 'border-[#382110] bg-[#382110] text-[#f4f1ea]'
                  : 'border-[#d6cdb8] bg-white text-[#5a4a3a] hover:bg-[#efe9da]')
              }
            >
              {c}
            </button>
          ))}
        </nav>

        {/* Quotes list */}
        <section className="flex flex-col gap-3.5">
          <p className="text-[13px] text-[#9b8e79]">
            {term
              ? `Results for “${query.trim()}” (${list.length})`
              : `Quotes tagged “${active}”`}
          </p>
          {list.length === 0 ? (
            <p className="py-10 text-center text-[15px] text-[#9b8e79]">
              No quotes found.
            </p>
          ) : (
            list.map((q) => {
              const id = quoteId(q);
              return (
                <QuoteCard
                  key={id}
                  quote={q}
                  liked={Boolean(liked[id])}
                  onToggle={() => toggle(id)}
                />
              );
            })
          )}
        </section>

        {/* Get the Android app */}
        <GetTheApp />

        {/* Newsletter — the secret door (type the unlock phrase) */}
        <section className="mt-10 rounded-lg border border-[#e0d8c4] bg-white p-6 text-center">
          <IoMailOutline className="mx-auto size-7 text-[#00635d]" />
          <h3 className="font-quote mt-2 text-[18px] font-bold text-[#382110]">
            A quote a day
          </h3>
          <p className="mt-1 text-[13px] text-[#7a6a55]">
            Get the Quote of the Day in your inbox every morning.
          </p>
          {subscribed ? (
            <p className="mt-4 text-[14px] font-semibold text-[#00635d]">
              You&apos;re subscribed 💌 Check your inbox.
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                tryUnlock();
              }}
              className="mx-auto mt-4 flex max-w-sm flex-col gap-2 sm:flex-row"
            >
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                aria-label="Email address"
                className="min-w-0 flex-1 rounded-md border border-[#d6cdb8] bg-[#faf8f2] px-3 py-2 text-[14px] outline-none placeholder:text-[#b3a78f] focus:border-[#00635d]"
              />
              <button
                type="submit"
                className="rounded-md bg-[#382110] px-4 py-2 text-[14px] font-semibold text-[#f4f1ea] transition-opacity active:opacity-80"
              >
                Subscribe
              </button>
            </form>
          )}
        </section>
      </main>

      <footer className="border-t border-[#e0d8c4] py-6 text-center text-[12px] text-[#9b8e79]">
        <p>Quotes provided by the ZenQuotes &amp; API Ninjas APIs.</p>
        <p className="mt-1">
          © {new Date().getFullYear()} {siteConfig.name} • v{pkg.version}
        </p>
      </footer>
    </div>
  );
}
