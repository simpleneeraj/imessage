// Server-only quote aggregation. Pulls from several sources, each fetch cached
// for a day (Next data cache) so the limited free-tier quotas are never burned.
// API keys are read from server env (never NEXT_PUBLIC) — see app/api/quotes.

import 'server-only';
import {
  CATEGORIES,
  QUOTES,
  type Category,
  type Quote,
} from '@/lib/quotes-data';

const DAY = 86400;
const NINJAS_KEY = process.env.API_NINJAS_KEY;

export type SimpleQuote = { text: string; author: string };
export type QuotesData = {
  qotd: SimpleQuote;
  categoryNames: string[];
  categories: Record<string, Quote[]>;
};

async function fetchJson<T>(
  url: string,
  init?: RequestInit & { revalidate?: number },
): Promise<T | null> {
  try {
    const res = await fetch(url, { ...init, next: { revalidate: DAY } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// Quote of the Day: ZenQuotes /today, FavQs /qotd fallback, curated last.
async function getQotd(): Promise<SimpleQuote> {
  const zen = await fetchJson<{ q?: string; a?: string }[]>(
    'https://zenquotes.io/api/today',
  );
  if (Array.isArray(zen) && zen[0]?.q) {
    return { text: zen[0].q, author: zen[0].a ?? 'Unknown' };
  }
  const fav = await fetchJson<{ quote?: { body?: string; author?: string } }>(
    'https://favqs.com/api/qotd',
  );
  if (fav?.quote?.body) {
    return { text: fav.quote.body, author: fav.quote.author ?? 'Unknown' };
  }
  const c = QUOTES.Love[QUOTES.Love.length - 1];
  return { text: c.text, author: c.author };
}

// "Discover" feed — a live, daily-rotating pool from ZenQuotes + API Ninjas.
async function getDiscover(): Promise<Quote[]> {
  const pool: Quote[] = [];

  const zen = await fetchJson<{ q?: string; a?: string }[]>(
    'https://zenquotes.io/api/quotes',
  );
  if (Array.isArray(zen)) {
    for (const q of zen) {
      if (q?.q && q.q.length <= 200) {
        pool.push({ text: q.q, author: q.a ?? 'Unknown', tags: ['discover'] });
      }
    }
  }

  if (NINJAS_KEY) {
    const batch = await Promise.all(
      Array.from({ length: 6 }, () =>
        fetchJson<{ quote?: string; author?: string; category?: string }[]>(
          'https://api.api-ninjas.com/v1/quotes',
          { headers: { 'X-Api-Key': NINJAS_KEY } },
        ),
      ),
    );
    for (const b of batch) {
      const q = Array.isArray(b) ? b[0] : null;
      if (q?.quote) {
        pool.push({
          text: q.quote,
          author: q.author ?? 'Unknown',
          tags: [q.category ?? 'discover'],
        });
      }
    }
  }

  // de-dupe by opening words, cap the feed
  const seen = new Set<string>();
  const out: Quote[] = [];
  for (const q of pool) {
    const k = q.text.slice(0, 40).toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(q);
  }
  return out.slice(0, 24);
}

export async function getQuotes(): Promise<QuotesData> {
  const [qotd, discover] = await Promise.all([getQotd(), getDiscover()]);

  const categories: Record<string, Quote[]> = {};
  for (const c of CATEGORIES) {
    // curated base + any live quotes whose tag matches this category
    const extra = discover.filter((q) =>
      q.tags.some((t) => t.toLowerCase() === (c as Category).toLowerCase()),
    );
    categories[c] = [...QUOTES[c], ...extra];
  }
  categories.Discover = discover.length ? discover : QUOTES.Love;

  return {
    qotd,
    categoryNames: [...CATEGORIES, 'Discover'],
    categories,
  };
}
