-- Profile mood/status, per-user hide ("delete for self"), and admin
-- ("delete for everyone", restorable) soft delete. Admin = conversations.created_by.

alter table public.profiles add column mood text;

alter table public.conversation_participants add column hidden_at timestamptz;
grant update (last_read_at, hidden_at) on table public.conversation_participants to authenticated;

alter table public.conversations add column deleted_at timestamptz;

-- Add members to a conversation (any member); returns the added profiles so the
-- caller can wrap the conversation key for them client-side.
create or replace function public.add_members(conv uuid, usernames text[])
returns setof public.profiles
language plpgsql security definer set search_path = public as $$
declare ids uuid[];
begin
  if auth.uid() is null or not public.is_member(conv) then
    raise exception 'not allowed';
  end if;
  select array_agg(p.id) into ids from profiles p
    where lower(p.username) = any (select lower(u) from unnest(usernames) u)
      and p.public_key is not null;
  if ids is null then raise exception 'user not found'; end if;
  insert into conversation_participants (conversation_id, user_id)
    select conv, uid from unnest(ids) uid
    on conflict do nothing;
  update conversations set is_group = true, updated_at = now()
    where id = conv
      and (select count(*) from conversation_participants where conversation_id = conv) > 2;
  return query select * from profiles where id = any (ids);
end $$;
revoke execute on function public.add_members(uuid, text[]) from public, anon;

-- Remove a member (admin only).
create or replace function public.remove_member(conv uuid, target uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() <> (select created_by from conversations where id = conv) then
    raise exception 'admin only';
  end if;
  delete from conversation_participants where conversation_id = conv and user_id = target;
end $$;
revoke execute on function public.remove_member(uuid, uuid) from public, anon;

-- Hide a conversation just for me ("delete for self").
create or replace function public.hide_conversation(conv uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_member(conv) then raise exception 'not allowed'; end if;
  update conversation_participants set hidden_at = now()
    where conversation_id = conv and user_id = (select auth.uid());
end $$;
revoke execute on function public.hide_conversation(uuid) from public, anon;

-- Soft delete / restore for everyone (admin only).
create or replace function public.set_conversation_deleted(conv uuid, deleted boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() <> (select created_by from conversations where id = conv) then
    raise exception 'admin only';
  end if;
  update conversations set deleted_at = case when deleted then now() else null end,
    updated_at = now() where id = conv;
end $$;
revoke execute on function public.set_conversation_deleted(uuid, boolean) from public, anon;
