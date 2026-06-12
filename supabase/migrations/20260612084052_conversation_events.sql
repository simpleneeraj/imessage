-- Enterprise audit trail: immutable log of membership/admin actions, shown
-- inline in the chat timeline. Metadata only (no message content), plaintext.

create table public.conversation_events (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  target_id uuid references public.profiles(id),
  type text not null check (type in (
    'member_added','member_removed','member_left',
    'group_created','conversation_deleted','conversation_restored'
  )),
  created_at timestamptz not null default now()
);
create index conversation_events_conv_idx on public.conversation_events (conversation_id, created_at);

alter table public.conversation_events enable row level security;
create policy "events read" on public.conversation_events
  for select to authenticated using (public.is_member(conversation_id));
-- inserts happen only inside the security-definer RPCs below

alter publication supabase_realtime add table public.conversation_events;

create or replace function public.log_event(conv uuid, kind text, target uuid default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into conversation_events (conversation_id, actor_id, target_id, type)
  values (conv, (select auth.uid()), target, kind);
end $$;
revoke execute on function public.log_event(uuid, text, uuid) from public, anon, authenticated;

-- add_members: log one event per added member
create or replace function public.add_members(conv uuid, usernames text[])
returns setof public.profiles
language plpgsql security definer set search_path = public as $$
declare ids uuid[]; uid uuid;
begin
  if auth.uid() is null or not public.is_member(conv) then
    raise exception 'not allowed';
  end if;
  select array_agg(p.id) into ids from profiles p
    where lower(p.username) = any (select lower(u) from unnest(usernames) u)
      and p.public_key is not null;
  if ids is null then raise exception 'user not found'; end if;
  insert into conversation_participants (conversation_id, user_id)
    select conv, u from unnest(ids) u on conflict do nothing;
  update conversations set is_group = true, updated_at = now()
    where id = conv
      and (select count(*) from conversation_participants where conversation_id = conv) > 2;
  foreach uid in array ids loop
    perform log_event(conv, 'member_added', uid);
  end loop;
  return query select * from profiles where id = any (ids);
end $$;
revoke execute on function public.add_members(uuid, text[]) from public, anon;

create or replace function public.remove_member(conv uuid, target uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() <> (select created_by from conversations where id = conv) then
    raise exception 'admin only';
  end if;
  delete from conversation_participants where conversation_id = conv and user_id = target;
  perform log_event(conv, 'member_removed', target);
end $$;
revoke execute on function public.remove_member(uuid, uuid) from public, anon;

-- Leave a group yourself (logs member_left + removes you).
create or replace function public.leave_conversation(conv uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_member(conv) then raise exception 'not allowed'; end if;
  perform log_event(conv, 'member_left', (select auth.uid()));
  delete from conversation_participants where conversation_id = conv and user_id = (select auth.uid());
end $$;
revoke execute on function public.leave_conversation(uuid) from public, anon;

-- log delete/restore too
create or replace function public.set_conversation_deleted(conv uuid, deleted boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() <> (select created_by from conversations where id = conv) then
    raise exception 'admin only';
  end if;
  update conversations set deleted_at = case when deleted then now() else null end,
    updated_at = now() where id = conv;
  perform log_event(conv, case when deleted then 'conversation_deleted' else 'conversation_restored' end);
end $$;
revoke execute on function public.set_conversation_deleted(uuid, boolean) from public, anon;
