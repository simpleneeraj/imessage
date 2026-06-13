import { ChatThread } from '@/components/ChatThread';
import { createClient } from '@/lib/supabase/server';

type ProfileRel = { display_name: string } | { display_name: string }[] | null;
type ParticipantRow = {
  user_id: string;
  nickname: string | null;
  passcode_hash: string | null;
  profiles: ProfileRel;
};

// Supabase types a to-one embed as an array; normalise to the single row.
function displayName(profiles: ProfileRel): string | undefined {
  const row = Array.isArray(profiles) ? profiles[0] : profiles;
  return row?.display_name;
}

// Server-side passcode gate: resolve the viewer's lock + chat title from their
// session cookie before any chat UI is sent to the client. When a lock exists
// the LockScreen is the first paint (no flash of chat content); when the
// session can't be read here it falls back to ChatThread's client lookup, so
// the gate fails safe.
async function resolveLock(id: string): Promise<{
  passcodeHash: string | null;
  title: string;
}> {
  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) return { passcodeHash: null, title: '' };

    const { data } = await supabase
      .from('conversations')
      .select(
        'name, is_group, conversation_participants(user_id, nickname, passcode_hash, profiles(display_name))',
      )
      .eq('id', id)
      .maybeSingle();
    if (!data) return { passcodeHash: null, title: '' };

    const participants = (data.conversation_participants ??
      []) as unknown as ParticipantRow[];
    const me = participants.find((p) => p.user_id === userId);
    const others = participants.filter((p) => p.user_id !== userId);
    const title = data.is_group
      ? (data.name ?? `${others.length} People`)
      : (others[0]?.nickname ??
        displayName(others[0]?.profiles ?? null) ??
        'Chat');

    return { passcodeHash: me?.passcode_hash ?? null, title };
  } catch {
    return { passcodeHash: null, title: '' };
  }
}

// Next 16: params is a Promise and must be awaited.
export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { passcodeHash, title } = await resolveLock(id);
  return (
    <ChatThread
      id={id}
      initialPasscodeHash={passcodeHash}
      initialTitle={title}
    />
  );
}
