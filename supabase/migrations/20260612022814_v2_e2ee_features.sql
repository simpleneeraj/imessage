-- ===================================================================
-- v2: E2EE, reactions, receipts, unsend/edit, vanish mode, attachments
-- ===================================================================

-- ============ 1. E2EE: identity public key + encrypted key backup ============

alter table public.profiles add column public_key text; -- base64 SPKI of ECDH P-256 public key

create table public.user_keys (
  user_id         uuid primary key references public.profiles(id) on delete cascade,
  enc_private_key text not null,            -- base64 AES-GCM(encKey, PKCS8 private key)
  iv              text not null,            -- base64 12-byte IV
  kdf_version     int  not null default 1,
  kdf_iterations  int  not null default 310000,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.user_keys enable row level security;

create policy "user_keys select own" on public.user_keys
  for select to authenticated using (user_id = (select auth.uid()));
create policy "user_keys insert own" on public.user_keys
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "user_keys update own" on public.user_keys
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ============ 2. Per-conversation wrapped keys ============

create table public.conversation_keys (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  wrapped_key     text not null,            -- base64 AES-GCM(ECDH(wrapped_by, user)->HKDF, raw conv key)
  iv              text not null,
  wrapped_by      uuid not null references public.profiles(id),
  created_at      timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index conversation_keys_user_idx on public.conversation_keys (user_id);

alter table public.conversation_keys enable row level security;

create policy "conv_keys select own" on public.conversation_keys
  for select to authenticated using (user_id = (select auth.uid()));
create policy "conv_keys insert by member" on public.conversation_keys
  for insert to authenticated
  with check (
    wrapped_by = (select auth.uid())
    and public.is_member(conversation_id)
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_keys.conversation_id
        and cp.user_id = conversation_keys.user_id
    )
  );
-- no UPDATE/DELETE: keys are immutable; PK prevents overwriting a grant

-- ============ 3. messages: envelope body + lifecycle columns ============

alter table public.messages
  add column ephemeral       boolean not null default false,
  add column view_once       boolean not null default false,
  add column attachment_path text,
  add column viewed_at       timestamptz,
  add column deleted_at      timestamptz,
  add column edited_at       timestamptz;

-- ciphertext envelope is ~1.4x plaintext; 4000-char plaintext cap is client-side
alter table public.messages drop constraint if exists messages_body_check;
alter table public.messages add constraint messages_body_check
  check (char_length(body) between 1 and 16000);

-- edit + unsend: own rows, only these columns
revoke update on table public.messages from authenticated;
grant update (body, edited_at, deleted_at, attachment_path)
  on table public.messages to authenticated;

create policy "messages update own" on public.messages
  for update to authenticated
  using (sender_id = (select auth.uid()))
  with check (sender_id = (select auth.uid()));

-- DELETE events (vanish mode) must carry conversation_id for client filters
alter table public.messages replica identity full;

-- ============ 4. stop leaking plaintext previews ============

create or replace function public.bump_conversation()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  update conversations
  set last_message_text = null,  -- E2EE: previews come from the local decrypted cache
      last_message_at = new.created_at,
      updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

update public.conversations set last_message_text = null;

-- ============ 5. reactions (tapbacks) ============

create table public.message_reactions (
  message_id      uuid not null references public.messages(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  reaction        text not null check (reaction in ('heart','like','dislike','haha','emphasis','question')),
  updated_at      timestamptz not null default now(),
  primary key (message_id, user_id)
);
create index message_reactions_conv_idx on public.message_reactions (conversation_id);

alter table public.message_reactions enable row level security;

create policy "reactions read" on public.message_reactions
  for select to authenticated using (public.is_member(conversation_id));
create policy "reactions insert own" on public.message_reactions
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_member(conversation_id)
    and exists (select 1 from public.messages m
                where m.id = message_reactions.message_id
                  and m.conversation_id = message_reactions.conversation_id)
  );
create policy "reactions update own" on public.message_reactions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "reactions delete own" on public.message_reactions
  for delete to authenticated using (user_id = (select auth.uid()));

alter table public.message_reactions replica identity full;
alter publication supabase_realtime add table public.message_reactions;

-- ============ 6. read receipts ============

alter table public.conversation_participants add column last_read_at timestamptz;

revoke update on table public.conversation_participants from authenticated;
grant update (last_read_at) on table public.conversation_participants to authenticated;

create policy "participants update own read marker" on public.conversation_participants
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ============ 7. vanish mode ============

alter table public.conversations add column vanish_mode boolean not null default false;

create or replace function public.set_vanish_mode(conv uuid, enabled boolean)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_member(conv) then
    raise exception 'not allowed';
  end if;
  update conversations set vanish_mode = enabled, updated_at = now() where id = conv;
end;
$$;
revoke execute on function public.set_vanish_mode(uuid, boolean) from public, anon;

-- delete ephemeral messages that every *other* participant has read
create or replace function public.delete_vanished(conv uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  r record;
begin
  if auth.uid() is null or not public.is_member(conv) then
    raise exception 'not allowed';
  end if;
  for r in
    select m.id, m.attachment_path
    from messages m
    where m.conversation_id = conv
      and m.ephemeral
      and not exists (
        select 1 from conversation_participants cp
        where cp.conversation_id = conv
          and cp.user_id <> m.sender_id
          and (cp.last_read_at is null or cp.last_read_at < m.created_at)
      )
  loop
    if r.attachment_path is not null then
      delete from storage.objects
      where bucket_id = 'attachments' and name = r.attachment_path;
    end if;
    delete from messages where id = r.id;
  end loop;
end;
$$;
revoke execute on function public.delete_vanished(uuid) from public, anon;

-- ============ 8. view-once destroy ============

create or replace function public.mark_attachment_viewed(msg uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  m record;
begin
  select * into m from messages where id = msg;
  if m.id is null or auth.uid() is null or not public.is_member(m.conversation_id) then
    raise exception 'not allowed';
  end if;
  -- sender opening their own message must not burn it; idempotent for races
  if not m.view_once or m.viewed_at is not null or m.sender_id = (select auth.uid()) then
    return;
  end if;
  update messages set viewed_at = now() where id = msg;
  if m.attachment_path is not null then
    delete from storage.objects
    where bucket_id = 'attachments' and name = m.attachment_path;
  end if;
end;
$$;
revoke execute on function public.mark_attachment_viewed(uuid) from public, anon;

-- ============ 9. storage: encrypted attachments bucket ============

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- object paths are '<conversation_id>/<random-uuid>'
create policy "attachments insert by member" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );
create policy "attachments read by member" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'attachments'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );
create policy "attachments delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'attachments' and owner_id = (select auth.uid()::text));
