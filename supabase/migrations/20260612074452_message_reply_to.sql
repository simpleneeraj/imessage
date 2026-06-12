-- Threaded replies: a message may quote another message in the same conversation.
alter table public.messages
  add column reply_to uuid references public.messages(id) on delete set null;
