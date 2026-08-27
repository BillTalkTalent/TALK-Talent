-- SECURITY FIX: the "Users can update own profile" policy (migration 001)
-- only checks auth.uid() = id — nothing stops a logged-in pending (or
-- rejected) member from PATCHing their own profiles row directly (e.g. via
-- the public REST API, bypassing the app's UI entirely) to set
-- status = 'approved', or role = 'admin', or is_superadmin = true.
-- The require_linkedin_for_approval trigger (migration 054/068) only
-- incidentally blocked this when linkedin_url was missing/invalid — a
-- pending member with *any* linkedin.com-shaped URL on file could fully
-- self-approve, completely bypassing manual review. Verified live against
-- a real pending account and reverted immediately.
--
-- This blocks exactly that: a user changing status/role/is_superadmin on
-- their OWN row, unless they were already an admin before the update.
-- Legitimate admin actions (approve/reject/setRole/setSuperAdmin) always
-- either target a *different* user's row, or — for the narrow self-editing
-- cases in setRole/setSuperAdmin — only ever run for someone whose OLD row
-- already has role = 'admin', so they're unaffected.
create or replace function public.prevent_self_status_role_escalation()
returns trigger language plpgsql as $$
begin
  if auth.uid() = old.id and coalesce(old.role, 'member') <> 'admin' then
    if new.status is distinct from old.status
       or new.role is distinct from old.role
       or new.is_superadmin is distinct from old.is_superadmin then
      raise exception 'You cannot change your own membership status or role.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_self_escalation on public.profiles;
create trigger profiles_prevent_self_escalation
  before update on public.profiles
  for each row execute function public.prevent_self_status_role_escalation();
