-- Remove the hardcoded project ref from the notify trigger: read the edge
-- function URL from Vault (set out-of-band as the `notify_fn_url` secret),
-- alongside the existing `notify_secret`.

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
