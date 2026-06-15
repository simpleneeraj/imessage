import type { Metadata } from 'next';
import { NewChat } from "@/components/NewChat";
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: `New Chat | ${siteConfig.name}`,
  description: 'Start a new conversation on festhub.',
  robots: { index: false, follow: false },
};

export default function NewChatPage() {
  return <NewChat />;
}
