import type { Metadata } from 'next';
import { LoveQuotes } from '@/components/LoveQuotes';
import { getQuotes } from '@/lib/quotes/sources';

// Public landing — a plain quotes page (SSR, quotes aggregated from several
// sources and cached for a day). The chat is reachable only via the secret door
// in the newsletter box, or directly at /chats.
export const metadata: Metadata = {
  title: 'Love Quotes',
  description: 'A small collection of words about love.',
  robots: { index: false, follow: false },
};

export const revalidate = 86400;

export default async function HomePage() {
  const data = await getQuotes();
  return <LoveQuotes data={data} />;
}
