-- Festhub features: chat vibes, per-chat nicknames, passcode lock.

-- Vibe: per-conversation personality (drives expressions + reaction sets).
alter table public.conversations
  add column vibe text not null default 'classic'
  check (vibe in ('classic', 'couple', 'friends', 'professional'));

-- Nickname (visible to the whole chat) + passcode verifier (own access gate;
-- a PBKDF2 hash, never the passcode itself) on participant rows.
alter table public.conversation_participants
  add column nickname text check (char_length(nickname) between 1 and 32),
  add column passcode_hash text check (char_length(passcode_hash) <= 128);

-- Widen the audit-event vocabulary.
alter table public.conversation_events
  drop constraint conversation_events_type_check;
alter table public.conversation_events
  add constraint conversation_events_type_check check (type in (
    'member_added', 'member_removed', 'member_left',
    'group_created', 'conversation_deleted', 'conversation_restored',
    'vibe_changed', 'nickname_changed'
  ));

-- Change the chat vibe (any member; logged).
create or replace function public.set_vibe(conv uuid, v text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if (select auth.uid()) is null or not is_member(conv) then
    raise exception 'not a member';
  end if;
  if v not in ('classic', 'couple', 'friends', 'professional') then
    raise exception 'invalid vibe';
  end if;
  update conversations set vibe = v where id = conv;
  perform log_event(conv, 'vibe_changed');
end $$;
revoke execute on function public.set_vibe(uuid, text) from public, anon;
grant execute on function public.set_vibe(uuid, text) to authenticated;

-- Set/clear a nickname for any member of the chat (Instagram-style; logged).
create or replace function public.set_nickname(conv uuid, target uuid, nick text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if (select auth.uid()) is null or not is_member(conv) then
    raise exception 'not a member';
  end if;
  update conversation_participants
     set nickname = nullif(trim(nick), '')
   where conversation_id = conv and user_id = target;
  if not found then
    raise exception 'target is not a member';
  end if;
  perform log_event(conv, 'nickname_changed', target);
end $$;
revoke execute on function public.set_nickname(uuid, uuid, text) from public, anon;
grant execute on function public.set_nickname(uuid, uuid, text) to authenticated;

-- Set/clear your own passcode gate for a chat (null clears it; not logged —
-- the lock itself is private).
create or replace function public.set_passcode(conv uuid, hash text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if (select auth.uid()) is null then
    raise exception 'auth required';
  end if;
  update conversation_participants
     set passcode_hash = hash
   where conversation_id = conv and user_id = (select auth.uid());
end $$;
revoke execute on function public.set_passcode(uuid, text) from public, anon;
grant execute on function public.set_passcode(uuid, text) to authenticated;
