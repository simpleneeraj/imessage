'use client';

import { AuthGate } from '@/components/AuthGate';

// Invite landing: a forced "join" (signup) flow carrying the invite token.
// A full navigation to /chats lets AuthProvider bootstrap the new session.
export function JoinClient({ token }: { token: string }) {
  return (
    <AuthGate
      inviteToken={token}
      onReady={() => {
        window.location.assign('/chats');
      }}
    />
  );
}
