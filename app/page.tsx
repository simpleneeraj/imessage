import type { Metadata } from 'next';
import { LoveQuotes } from '@/components/LoveQuotes';

// Public landing — a plain love-quotes page. The chat is reachable only via the
// secret door in the footer (triple-tap the ♥) or directly at /chats.
export const metadata: Metadata = {
  title: 'Love Quotes',
  description: 'A small collection of words about love.',
  robots: { index: false, follow: false },
};

export default function HomePage() {
  return <LoveQuotes />;
}
