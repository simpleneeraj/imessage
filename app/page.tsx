import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { CreateSpace } from '@/components/CreateSpace';

export const metadata: Metadata = {
  title: 'Create your space — Monarch',
  description:
    'Spin up a private, end-to-end encrypted space for two on its own subdomain.',
};

// Root domain (chat.cutecode.app) → space onboarding.
// A tenant subdomain (<slug>.chat.cutecode.app) → straight into the app.
export default async function HomePage() {
  const slug = (await headers()).get('x-tenant') ?? '';
  if (slug) redirect('/chats');
  return <CreateSpace />;
}
