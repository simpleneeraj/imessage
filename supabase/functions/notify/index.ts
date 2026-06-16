// Edge function: send a Web Push to a message's recipients. Invoked by the
// `on_message_notify` DB trigger (pg_net) on every messages INSERT, guarded by
// a shared secret. Message text is E2EE, so the push body stays generic.

import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const NOTIFY_SECRET = Deno.env.get('NOTIFY_SECRET')!;
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT =
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:teamsimpleneeraj@gmail.com';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

Deno.serve(async (req) => {
  if (req.headers.get('x-notify-secret') !== NOTIFY_SECRET) {
    return new Response('forbidden', { status: 401 });
  }

  const { conversation_id, sender_id } = await req.json();
  if (!conversation_id || !sender_id) {
    return new Response('bad request', { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // sender display name (not E2EE — safe to show in the notification title)
  const { data: sender } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', sender_id)
    .single();
  const title = sender?.display_name ?? 'New message';

  // recipients = the other participants of this conversation
  const { data: parts } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversation_id)
    .neq('user_id', sender_id);
  const recipientIds = (parts ?? []).map((p) => p.user_id);
  if (recipientIds.length === 0) return new Response('no recipients');

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', recipientIds);

  const payload = JSON.stringify({
    title,
    body: 'New message',
    url: `/letters/${conversation_id}`,
    tag: `conv-${conversation_id}`,
  });

  const results = await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        const r = await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        return { ok: true, status: r.statusCode };
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode;
        // NOTE: we deliberately do NOT delete on 404/410 here. In a TWA the FCM
        // endpoint can return a transient 410 right after the app reopens / the
        // SW restarts, and eagerly deleting wiped a still-good subscription
        // (the user then silently stopped receiving everything). A genuinely
        // re-subscribed device replaces its row via save_push_subscription
        // (delete-by-endpoint), so stale rows get reclaimed naturally.
        return { ok: false, status, error: (err as Error)?.message };
      }
    }),
  );

  return new Response(
    JSON.stringify({ title, recipients: recipientIds.length, sent: results }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
