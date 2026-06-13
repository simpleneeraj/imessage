-- ===================================================================
-- Realtime Authorization for 1:1 call signaling (private broadcast channels).
-- Channels are named `call:user:<uuid>` (a user's call inbox). Only that user
-- and the other member of their space may read/write the topic — so nobody can
-- subscribe to a stranger's call inbox or spam them with invites.
-- Applies ONLY to channels opened with `{ config: { private: true } }`; public
-- channels (postgres_changes, typing, etc.) are unaffected.
-- ===================================================================

create or replace function public.can_access_call_topic(topic text)
returns boolean
language plpgsql security definer stable set search_path = public as $$
declare target uuid;
begin
  -- must be a well-formed call inbox topic
  if topic !~ '^call:user:[0-9a-fA-F-]{36}$' then
    return false;
  end if;
  target := substring(topic from 11)::uuid;  -- after 'call:user:'

  -- your own inbox
  if target = (select auth.uid()) then
    return true;
  end if;

  -- ...or the other member of your space (same tenant)
  return exists (
    select 1
    from public.profiles me
    join public.profiles other on other.tenant_id = me.tenant_id
    where me.id = (select auth.uid())
      and other.id = target
  );
exception when others then
  return false;
end $$;
revoke execute on function public.can_access_call_topic(text) from public, anon;
grant execute on function public.can_access_call_topic(text) to authenticated;

-- RLS on realtime.messages gates private-channel reads (subscribe) and writes
-- (broadcast). Default-deny: any private topic that isn't an authorized call
-- inbox is rejected.
drop policy if exists "call topic read" on realtime.messages;
create policy "call topic read" on realtime.messages
  for select to authenticated
  using (public.can_access_call_topic((select realtime.topic())));

drop policy if exists "call topic write" on realtime.messages;
create policy "call topic write" on realtime.messages
  for insert to authenticated
  with check (public.can_access_call_topic((select realtime.topic())));
