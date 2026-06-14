'use client';

import type { Message, ParticipantMeta } from '@/lib/types';

const TIME_FMT = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
});

// "Delivered" / "Read 2:51 PM" under the sender's last message, iMessage style.
export function Receipt({
  lastOwnMessage,
  participantsMeta,
  me,
}: {
  lastOwnMessage: Message | undefined;
  participantsMeta: ParticipantMeta[];
  me: string;
}) {
  if (!lastOwnMessage || lastOwnMessage.status || lastOwnMessage.deleted_at) {
    return null;
  }

  const others = participantsMeta.filter((p) => p.user_id !== me);
  if (others.length === 0) return null;

  const readMarkers = others
    .map((p) => p.last_read_at)
    .filter((t): t is string => t !== null && t >= lastOwnMessage.created_at);
  const readByAll = readMarkers.length === others.length;

  return (
    <p
      data-testid="receipt"
      className="mt-0.5 pr-1 text-right text-[10px] text-muted-foreground"
    >
      {readByAll ? (
        <>
          <span className="font-semibold">Read</span>{' '}
          {
            TIME_FMT.format(
              new Date(readMarkers.sort()[0]),
            ) /* earliest full-read */
          }
        </>
      ) : (
        <span className="font-semibold">Delivered</span>
      )}
    </p>
  );
}
