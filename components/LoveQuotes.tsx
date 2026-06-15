'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { IoHeart, IoHeartOutline, IoLogoOctocat, IoSearch } from 'react-icons/io5';
import Logo from './logo';
import {
  CATEGORIES,
  QUOTES,
  likeCount,
  type Category,
  type Quote,
} from '@/lib/quotes-data';

// Public face of the app: a Goodreads-style "Love Quotes" reading page. The
// chat is reachable only via the secret door — triple-tap the wordmark.

const fetcher = (url: string) =>
  fetch(url).then((r) => r.json() as Promise<{ text: string; author: string }>);

const FALLBACK_QOTD = {
  text: 'Being deeply loved by someone gives you strength, while loving someone deeply gives you courage.',
  author: 'Lao Tzu',
};

const serif = { fontFamily: 'var(--font-merriweather), Georgia, serif' };
const display = { fontFamily: 'var(--font-alice), Georgia, serif' };
const fmt = (n: number) => n.toLocaleString('en-US');

function LikeButton({
  id,
  liked,
  onToggle,
}: {
  id: string;
  liked: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
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
  onToggle: (id: string) => void;
}) {
  const base = likeCount(quote.text);
  const id = quote.author + quote.text.slice(0, 12);
  return (
    <article className="rounded-md border border-[#e6e0cf] bg-white p-5 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <blockquote
          className="whitespace-pre-line text-[17px] leading-[1.7] text-[#382110]"
          style={serif}
        >
          &ldquo;{quote.text}&rdquo;
        </blockquote>
        <LikeButton id={id} liked={liked} onToggle={onToggle} />
      </div>
      <p className="mt-3 text-[14px] text-[#7a6a55]" style={serif}>
        ―{' '}
        <span className="font-semibold text-[#00635d]">{quote.author}</span>
      </p>
      <p className="mt-2 text-[12px] leading-5 text-[#9b8e79]">
        tags:{' '}
        {quote.tags.map((t, i) => (
          <span key={t}>
            <span className="text-[#00635d]">{t}</span>
            {i < quote.tags.length - 1 ? ', ' : ''}
          </span>
        ))}
      </p>
      <p className="mt-2 text-[12px] font-semibold text-[#7a6a55]">
        {fmt(base + (liked ? 1 : 0))} likes
      </p>
    </article>
  );
}

export function LoveQuotes() {
  const router = useRouter();
  const taps = useRef<number[]>([]);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [active, setActive] = useState<Category>('Love');
  const [query, setQuery] = useState('');
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useSWR('/api/qotd', fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  const qotd = data ?? FALLBACK_QOTD; // fallback if the proxy itself fails
  const showSkeleton = isLoading && !data;

  // Secret door on the footer ♥: double-tap OR long-press opens the chat.
  const enterChat = () => router.push('/chats');
  function heartDown() {
    pressTimer.current = setTimeout(() => {
      pressTimer.current = null;
      enterChat(); // long-press
    }, 600);
  }
  function heartUp() {
    if (!pressTimer.current) return; // long-press already fired
    clearTimeout(pressTimer.current);
    pressTimer.current = null;
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 500), now];
    if (taps.current.length >= 2) {
      taps.current = [];
      enterChat(); // double-tap
    }
  }
  function heartCancel() {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  const toggle = (id: string) =>
    setLiked((m) => ({ ...m, [id]: !m[id] }));

  const term = query.trim().toLowerCase();
  const list: Quote[] = term
    ? Object.values(QUOTES)
        .flat()
        .filter(
          (q) =>
            q.text.toLowerCase().includes(term) ||
            q.author.toLowerCase().includes(term) ||
            q.tags.some((t) => t.includes(term)),
        )
    : QUOTES[active];

  return (
    <div className="min-h-dvh bg-[#f4f1ea] text-[#382110]">
      {/* Masthead */}
      <header className="sticky top-0 z-10 border-b border-[#e0d8c4] bg-[#f4f1ea]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={enterChat}
            className="transition-opacity active:opacity-70"
          >
            <Logo
              size="lg"
              parts={[
                { text: 'fest', className: 'text-[#382110]' },
                { text: 'hub', className: 'text-[#00635d]' },
              ]}
            />
          </button>
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
          <h2
            className="mb-2 text-[13px] font-semibold uppercase tracking-[0.18em] text-[#9b8e79]"
          >
            Quote of the Day
          </h2>
          {showSkeleton ? (
            <div className="animate-pulse rounded-md border border-[#e6e0cf] bg-[#efe9da] p-6">
              <div className="h-4 w-5/6 rounded bg-[#ded5bf]" />
              <div className="mt-2 h-4 w-3/4 rounded bg-[#ded5bf]" />
              <div className="mt-4 h-3 w-32 rounded bg-[#ded5bf]" />
            </div>
          ) : (
            <article className="rounded-md border border-[#d8b24a]/40 bg-gradient-to-b from-[#fbf4df] to-white p-6">
              <blockquote
                className="text-[20px] leading-[1.6] text-[#382110]"
                style={serif}
              >
                &ldquo;{qotd.text}&rdquo;
              </blockquote>
              <p className="mt-3 text-[14px] font-semibold text-[#00635d]">
                ― {qotd.author}
              </p>
            </article>
          )}
        </section>

        {/* Categories */}
        <nav className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((c) => (
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
              const id = q.author + q.text.slice(0, 12);
              return (
                <QuoteCard
                  key={id}
                  quote={q}
                  liked={Boolean(liked[id])}
                  onToggle={toggle}
                />
              );
            })
          )}
        </section>
      </main>

      <footer className="border-t border-[#e0d8c4] py-6 text-center text-[12px] text-[#9b8e79]">
        <p>
          Made with <IoHeart className="inline size-2.5 text-rose-500" /> for the hopeless romantics.
        </p>
        <p className="mt-1">Quote of the day provided by the ZenQuotes API.</p>
        <p className="mt-1">© {new Date().getFullYear()} festhub</p>
        <button
          type="button"
          onPointerDown={heartDown}
          onPointerUp={heartUp}
          onPointerLeave={heartCancel}
          onPointerCancel={heartCancel}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="secret entrance"
          className="mt-3 cursor-pointer select-none outline-none"
          style={{ touchAction: 'manipulation' }}
        >
          <IoLogoOctocat
            className="size-5 text-[#b3a78f] transition-colors hover:text-[#382110]"
            style={{ animation: 'octo-spin 3s ease-in-out infinite' }}
          />
        </button>
        <style>{`
          @keyframes octo-spin {
            0%, 100% { transform: rotate(0deg) scale(1); }
            25% { transform: rotate(-15deg) scale(1.15); }
            50% { transform: rotate(0deg) scale(1); }
            75% { transform: rotate(15deg) scale(1.15); }
          }
        `}</style>
      </footer>
    </div>
  );
}
