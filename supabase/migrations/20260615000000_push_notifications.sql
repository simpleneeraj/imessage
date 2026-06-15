-- ===================================================================
-- Web Push notifications: store device subscriptions, and on each new
-- message fire the `notify` edge function (async, via pg_net) so the
-- recipient gets a background push even when the app is closed.
-- ===================================================================

create extension if not exists pg_net with schema extensions;

-- ---- per-device push subscriptions ----
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- You manage only your own subscriptions.
drop policy if exists "own push subs" on public.push_subscriptions;
create policy "own push subs" on public.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---- fire the edge function on new messages ----
-- Both the function URL and the shared secret live in Supabase Vault (set
-- out-of-band, never committed): `notify_fn_url` + `notify_secret`. The edge
-- function verifies the secret via the x-notify-secret header.
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  fn_url text;
  secret text;
begin
  select decrypted_secret into fn_url
    from vault.decrypted_secrets where name = 'notify_fn_url' limit 1;
  select decrypted_secret into secret
    from vault.decrypted_secrets where name = 'notify_secret' limit 1;

  if fn_url is null then
    return new; -- not configured on this environment; skip quietly
  end if;

  perform net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notify-secret', coalesce(secret, '')
    ),
    body := jsonb_build_object(
      'message_id', new.id,
      'conversation_id', new.conversation_id,
      'sender_id', new.sender_id
    )
  );
  return new;
end $$;

drop trigger if exists on_message_notify on public.messages;
create trigger on_message_notify
  after insert on public.messages
  for each row execute function public.notify_new_message();
