import type { Metadata } from 'next';
import { ChatThread } from '@/components/ChatThread';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: `Chat | ${siteConfig.name}`,
  description: 'Conversation on festhub.',
  robots: { index: false, follow: false },
};

// Next 16: params is a Promise and must be awaited.
export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ChatThread id={id} />;
}
