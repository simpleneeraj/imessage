-- iMessage clone — run this whole file in the Supabase Dashboard SQL editor.
-- Prerequisite: Authentication -> Sign In / Up -> enable "Allow anonymous sign-ins".

-- ============ TABLES ============

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (username ~ '^[a-zA-Z0-9_]{2,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 50),
  created_at timestamptz not null default now()
);
create unique index profiles_username_lower on public.profiles (lower(username));

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  name text,
  created_by uuid not null references public.profiles(id),
  last_message_text text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index cp_user_idx on public.conversation_participants (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null check (char_length(body) between 1 and 4000),
  -- idempotency key generated on the client; makes offline-outbox retries safe
  client_id uuid not null unique,
  created_at timestamptz not null default now()
);
create index messages_conv_created_idx on public.messages (conversation_id, created_at);

-- ============ MEMBERSHIP CHECK ============
-- security definer is required here: an RLS policy on conversation_participants
-- that selects from conversation_participants recurses (error 42P17).
create or replace function public.is_member(conv uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1 from conversation_participants
    where conversation_id = conv and user_id = (select auth.uid())
  );
$$;
revoke execute on function public.is_member(uuid) from public, anon;

-- ============ RLS ============

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- profiles: any signed-in user can read (username search), write own row only
create policy "profiles read" on public.profiles
  for select to authenticated using (true);
create policy "profiles insert own" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "conversations read" on public.conversations
  for select to authenticated using (public.is_member(id));

create policy "participants read" on public.conversation_participants
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_member(conversation_id));

create policy "messages read" on public.messages
  for select to authenticated using (public.is_member(conversation_id));
create policy "messages insert" on public.messages
  for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.is_member(conversation_id));

-- Conversations/participants have no client INSERT/UPDATE policies on purpose:
-- creation goes through the RPC below and the bump trigger handles updates.

-- ============ CONVERSATION CREATION RPC ============

create or replace function public.create_conversation(
  other_usernames text[],
  group_name text default null
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  member_ids uuid[];
  conv uuid;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
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
    if conv is not null then
      return conv;
    end if;
  end if;

  insert into conversations (is_group, name, created_by)
  values (array_length(member_ids, 1) > 1, nullif(trim(group_name), ''), me)
  returning id into conv;

  insert into conversation_participants (conversation_id, user_id)
  select conv, uid from unnest(member_ids || me) uid;

  return conv;
end;
$$;
revoke execute on function public.create_conversation(text[], text) from public, anon;

-- ============ LAST-MESSAGE BUMP TRIGGER ============
-- security definer because senders have no UPDATE policy on conversations.
create or replace function public.bump_conversation()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  update conversations
  set last_message_text = new.body,
      last_message_at = new.created_at,
      updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;
revoke execute on function public.bump_conversation() from public, anon, authenticated;

create trigger messages_bump
  after insert on public.messages
  for each row execute function public.bump_conversation();

-- ============ REALTIME ============

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.conversation_participants;
