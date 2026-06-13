-- ===================================================================
-- Multi-tenancy: subdomain "spaces", max 2 members each, fully isolated.
-- Each subdomain <slug>.chat.cutecode.app maps to one row in tenants.
-- Clean-reset assumed: existing profiles must be re-created with a tenant_id.
-- ===================================================================

create table if not exists public.tenants (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique
                  check (slug ~ '^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$'),
  name            text check (char_length(name) <= 50),
  -- single-use invite for the 2nd member; never exposed to anon (see get_invite)
  invite_token    uuid not null default gen_random_uuid(),
  invited_user_id uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);
alter table public.tenants enable row level security;

-- Slugs are non-secret: the root page checks availability and signup resolves
-- the id *before* a session exists, so anon may read.
drop policy if exists "tenants read" on public.tenants;
create policy "tenants read" on public.tenants
  for select to anon, authenticated using (true);
-- No direct writes; slug reservation goes through reserve_tenant().
-- Column-scoped on purpose: invite_token / invited_user_id are NEVER directly
-- readable — the token is only handed out via get_invite() to its own members.
grant select (id, slug, name, created_at) on table public.tenants to anon, authenticated;

-- ---- profiles belong to a tenant; usernames are unique *per tenant* ----
alter table public.profiles
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;
create index if not exists profiles_tenant_idx on public.profiles (tenant_id);

drop index if exists public.profiles_username_lower;
create unique index if not exists profiles_tenant_username_lower
  on public.profiles (tenant_id, lower(username));

-- caller's tenant; security definer so it bypasses RLS (and the policy below
-- can't recurse on profiles).
create or replace function public.current_tenant()
returns uuid language sql security definer stable set search_path = public as $$
  select tenant_id from public.profiles where id = (select auth.uid());
$$;
revoke execute on function public.current_tenant() from public, anon;
grant execute on function public.current_tenant() to authenticated;

-- Hard isolation: you can only read profiles in your own space. RESTRICTIVE so
-- it AND-combines with the existing permissive "profiles read" policy.
-- The `id = auth.uid()` arm is required: on INSERT ... RETURNING, Postgres runs
-- this SELECT policy against the new row, but current_tenant() (STABLE) can't
-- see the just-inserted row yet, so a tenant-only check would reject your own
-- signup row. Letting you always see your own profile fixes that and is correct.
drop policy if exists "profiles tenant isolation" on public.profiles;
create policy "profiles tenant isolation" on public.profiles
  as restrictive for select to authenticated
  using (
    id = (select auth.uid())
    or tenant_id = public.current_tenant()
  );

-- Require a tenant, cap each space at 2 members, and require a redeemed invite
-- for the 2nd member (server-enforced; the 1st member opens the space).
create or replace function public.enforce_tenant_cap()
returns trigger language plpgsql security definer set search_path = public as $$
declare cnt int; invited uuid;
begin
  if new.tenant_id is null then
    raise exception 'tenant required' using errcode = 'check_violation';
  end if;
  cnt := (select count(*) from public.profiles where tenant_id = new.tenant_id);
  if cnt = 0 then
    return new;                                   -- member #1 opens the space
  elsif cnt = 1 then
    select invited_user_id into invited from public.tenants where id = new.tenant_id;
    if invited is distinct from new.id then
      raise exception 'An invite is required to join this space.'
        using errcode = 'check_violation';
    end if;
    return new;                                   -- member #2 with a redeemed invite
  else
    raise exception 'This space is full (2/2).' using errcode = 'check_violation';
  end if;
end $$;
drop trigger if exists profiles_tenant_cap on public.profiles;
create trigger profiles_tenant_cap before insert on public.profiles
  for each row execute function public.enforce_tenant_cap();

-- Hand the caller their own space's invite link details (token never leaves the
-- server otherwise). `used` flips once the space has both members.
create or replace function public.get_invite()
returns table (slug text, token uuid, used boolean)
language sql security definer stable set search_path = public as $$
  select t.slug, t.invite_token,
         (select count(*) from public.profiles p where p.tenant_id = t.id) >= 2
  from public.tenants t
  where t.id = public.current_tenant();
$$;
revoke execute on function public.get_invite() from public, anon;
grant execute on function public.get_invite() to authenticated;

-- The 2nd member redeems the invite (called once authenticated, before their
-- profile row is inserted). Claims the single open slot for this user.
create or replace function public.redeem_invite(p_slug text, p_token uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t record;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  select * into t from public.tenants where slug = lower(p_slug);
  if t.id is null or t.invite_token is distinct from p_token then
    raise exception 'invalid invite';
  end if;
  if (select count(*) from public.profiles where tenant_id = t.id) >= 2 then
    raise exception 'This space is full (2/2).';
  end if;
  if t.invited_user_id is not null and t.invited_user_id <> auth.uid() then
    raise exception 'invite already used';
  end if;
  update public.tenants set invited_user_id = auth.uid() where id = t.id;
end $$;
revoke execute on function public.redeem_invite(text, uuid) from public, anon;
grant execute on function public.redeem_invite(text, uuid) to authenticated;

-- Reserve a slug from the root domain (no session yet → callable by anon).
create or replace function public.reserve_tenant(p_slug text, p_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare t_id uuid;
begin
  p_slug := lower(trim(p_slug));
  if p_slug !~ '^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$'
     or p_slug in ('www','app','api','admin','root','chat','mail','static','assets') then
    raise exception 'invalid slug';
  end if;
  insert into public.tenants (slug, name)
  values (p_slug, nullif(trim(p_name), ''))
  on conflict (slug) do nothing
  returning id into t_id;
  if t_id is null then
    raise exception 'slug taken' using errcode = 'unique_violation';
  end if;
  return t_id;
end $$;
revoke execute on function public.reserve_tenant(text, text) from public;
grant execute on function public.reserve_tenant(text, text) to anon, authenticated;

-- ---- scope username-lookup RPCs to the caller's tenant ----

create or replace function public.create_conversation(
  other_usernames text[],
  group_name text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  my_tenant uuid := public.current_tenant();
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
    and p.tenant_id = my_tenant
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
      and p.tenant_id = public.current_tenant()
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
