import { JoinClient } from '@/components/JoinClient';

// Next 16: params is a Promise and must be awaited.
export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <JoinClient token={token} />;
}
