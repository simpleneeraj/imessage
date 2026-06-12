import type { Metadata } from 'next';
import { Landing } from '@/components/landing/Landing';

export const metadata: Metadata = {
  title: 'Monarch — Rule your conversations',
  description:
    'Monarch is a beautifully crafted, end-to-end encrypted messenger. Realtime, offline-first, themeable — your messages, your keys, your kingdom.',
};

export default function LandingPage() {
  return <Landing />;
}
