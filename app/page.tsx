import type { Metadata } from 'next';
import { LoveQuotes } from '@/components/LoveQuotes';

// Public landing — a plain love-quotes page. The chat is reachable only via the
// secret door in the footer (triple-tap the ♥) or directly at /chats.
export const metadata: Metadata = {
  title: 'FestHub',
  description: 'Discover and share your favourite quotes, all in one place.',
  robots: { index: false, follow: false },
};

export default function HomePage() {
  return <LoveQuotes />;
}
