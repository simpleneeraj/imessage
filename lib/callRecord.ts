import { supabase } from './supabase';
import { getConvKey } from './keys';
import { encryptEnvelope } from './crypto';

// Writes an E2EE "call record" message into a conversation when a call ends, so
// both people see it in the timeline (like iMessage's call log). Only the
// caller records, to avoid duplicates. Fire-and-forget — calls are online.
export async function recordCall(
  conversationId: string,
  senderId: string,
  media: 'audio' | 'video',
  outcome: 'completed' | 'missed',
  duration: number,
): Promise<void> {
  try {
    const convKey = await getConvKey(conversationId);
    if (!convKey) return;
    const body = await encryptEnvelope(
      { kind: 'call', media, outcome, duration },
      convKey,
      conversationId,
    );
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: senderId,
      body,
      client_id: crypto.randomUUID(),
    });
  } catch {
    // a missing call log is not worth surfacing an error for
  }
}

// Persists an in-call chat message into the conversation timeline (flagged
// inCall so the bubble shows a "during call" badge). Sent alongside the
// ephemeral in-call broadcast so the message survives after the call ends.
export async function recordCallChat(
  conversationId: string,
  senderId: string,
  text: string,
): Promise<void> {
  try {
    const convKey = await getConvKey(conversationId);
    if (!convKey) return;
    const body = await encryptEnvelope(
      { kind: 'text', text, inCall: true },
      convKey,
      conversationId,
    );
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: senderId,
      body,
      client_id: crypto.randomUUID(),
    });
  } catch {
    // non-fatal — the live in-call message still showed via broadcast
  }
}
