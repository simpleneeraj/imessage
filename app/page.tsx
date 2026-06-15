import type { Metadata } from 'next';
import { LoveQuotes } from '@/components/LoveQuotes';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  robots: { index: false, follow: false },
};

export default function HomePage() {
  return <LoveQuotes />;
}
