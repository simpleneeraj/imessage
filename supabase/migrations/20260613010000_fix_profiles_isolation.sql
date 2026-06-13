-- Fix: the "profiles tenant isolation" RESTRICTIVE select policy broke signup.
--
-- signUp does `insert(...).select()` → INSERT ... RETURNING, and Postgres runs
-- the SELECT policy against the row being returned. current_tenant() is STABLE,
-- so within that insert it can't yet see the just-inserted profile row and
-- returns NULL → `tenant_id = NULL` is false → "new row violates row-level
-- security policy 'profiles tenant isolation'".
--
-- Adding the `id = auth.uid()` arm lets you always see your OWN profile (true on
-- the RETURNING row regardless of the tenant subquery) while still hiding every
-- other tenant's rows (id <> you AND tenant_id <> yours → not visible).
--
-- Note: this re-creates the policy from 20260613000000_tenancy.sql; editing that
-- already-applied migration would not re-run, so the fix ships as its own file.

drop policy if exists "profiles tenant isolation" on public.profiles;

create policy "profiles tenant isolation" on public.profiles
  as restrictive for select to authenticated
  using (
    id = (select auth.uid())
    or tenant_id = public.current_tenant()
  );
