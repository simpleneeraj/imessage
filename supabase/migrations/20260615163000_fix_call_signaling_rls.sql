-- Fix call signaling RLS after dropping tenant_id column
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

  -- ...or they share a conversation
  return exists (
    select 1
    from public.conversation_participants cp1
    join public.conversation_participants cp2 on cp2.conversation_id = cp1.conversation_id
    where cp1.user_id = (select auth.uid())
      and cp2.user_id = target
  );
exception when others then
  return false;
end $$;
