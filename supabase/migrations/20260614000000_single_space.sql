-- ===================================================================
-- Collapse to a single private space: remove multi-tenancy entirely and
-- drop the per-chat passcode gate. Clean-reset assumed (E2EE keys change,
-- so accounts are re-created anyway).
-- ===================================================================

-- ---- 1. Tenant isolation policy + helper (drop before the column) ----
drop policy if exists "profiles tenant isolation" on public.profiles;
drop function if exists public.current_tenant() cascade;

-- ---- 2. Per-tenant cap trigger + invite/reserve RPCs ----
drop trigger if exists profiles_tenant_cap on public.profiles;
drop function if exists public.enforce_tenant_cap() cascade;
drop function if exists public.get_invite() cascade;
drop function if exists public.redeem_invite(text, uuid) cascade;
drop function if exists public.reserve_tenant(text, text) cascade;

-- ---- 3. profiles: drop tenant scoping, restore global username uniqueness ----
drop index if exists public.profiles_tenant_username_lower;
drop index if exists public.profiles_tenant_idx;
alter table public.profiles drop column if exists tenant_id;
create unique index if not exists profiles_username_lower
  on public.profiles (lower(username));

-- ---- 4. Drop the tenants table ----
drop table if exists public.tenants cascade;

-- ---- 5. Rewrite conversation RPCs without any tenant filter ----
create or replace function public.create_conversation(
  other_usernames text[],
  group_name text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  member_ids uuid[];
  conv uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if other_usernames is null or array_length(other_usernames, 1) is null then
    raise exception 'no recipients';
  end if;
  if array_length(other_usernames, 1) > 31 then
    raise exception 'too many recipients';
  end if;

  select array_agg(distinct p.id) into member_ids
  from profiles p
  where lower(p.username) in (select lower(u) from unnest(other_usernames) u)
    and p.id <> me;
  if member_ids is null
     or array_length(member_ids, 1) <> (
       select count(distinct lower(u)) from unnest(other_usernames) u
     ) then
    raise exception 'user not found';
  end if;

  -- reuse an existing 1:1 conversation
  if array_length(member_ids, 1) = 1 then
    select cp.conversation_id into conv
    from conversation_participants cp
    join conversations c on c.id = cp.conversation_id and not c.is_group
    where cp.user_id = me
      and exists (
        select 1 from conversation_participants cp2
        where cp2.conversation_id = cp.conversation_id
          and cp2.user_id = member_ids[1]
      )
    limit 1;
    if conv is not null then return conv; end if;
  end if;

  insert into conversations (is_group, name, created_by)
  values (array_length(member_ids, 1) > 1, nullif(trim(group_name), ''), me)
  returning id into conv;

  insert into conversation_participants (conversation_id, user_id)
  select conv, uid from unnest(member_ids || me) uid;

  return conv;
end $$;
revoke execute on function public.create_conversation(text[], text) from public, anon;
grant execute on function public.create_conversation(text[], text) to authenticated;

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
grant execute on function public.add_members(uuid, text[]) to authenticated;

-- ---- 6. Remove the per-chat passcode gate ----
drop function if exists public.set_passcode(uuid, text) cascade;
alter table public.conversation_participants drop column if exists passcode_hash;
