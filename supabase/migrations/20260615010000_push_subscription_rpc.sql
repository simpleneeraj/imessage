-- Account-switch robustness for Web Push.
--
-- A browser has exactly ONE push endpoint, but our table keys it to a user_id.
-- When two accounts are used in the same browser, the second can't claim the
-- endpoint (RLS only lets you write your own row), so its subscription silently
-- fails. This SECURITY DEFINER RPC reassigns the endpoint to the caller: it
-- deletes any existing row for that endpoint (regardless of owner) and inserts
-- a fresh one for auth.uid().

create or replace function public.save_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if (select auth.uid()) is null then
    raise exception 'auth required';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
    values ((select auth.uid()), p_endpoint, p_p256dh, p_auth);
end $$;

revoke execute on function public.save_push_subscription(text, text, text)
  from public, anon;
grant execute on function public.save_push_subscription(text, text, text)
  to authenticated;
