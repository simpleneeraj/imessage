-- Per-conversation wallpaper theme id, shared with all participants.
alter table public.conversations add column wallpaper text;

create or replace function public.set_wallpaper(conv uuid, theme text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_member(conv) then
    raise exception 'not allowed';
  end if;
  update conversations set wallpaper = theme, updated_at = now() where id = conv;
end;
$$;
revoke execute on function public.set_wallpaper(uuid, text) from public, anon;
