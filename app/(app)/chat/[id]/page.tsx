import { ChatThread } from '@/components/ChatThread';

// Next 16: params is a Promise and must be awaited.
export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ChatThread id={id} />;
}
