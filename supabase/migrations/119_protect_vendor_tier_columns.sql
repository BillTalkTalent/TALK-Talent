-- "Claimed vendor accounts can update their own listing" (migration 107)
-- is a row-level RLS policy — it has no way to say "but not THIS column".
-- A vendor contact hitting the REST API directly (not through the portal
-- UI, which never sends these fields) could set tier/is_featured/is_paying
-- on their own row and grant themselves a paid package for free. Column-
-- level GRANTs can't fix this either: admins update vendors through the
-- same `authenticated` Postgres role as vendor contacts (role is just a
-- profiles.role value, not a separate DB role), so a trigger that checks
-- who's actually asking is the only way to tell them apart per-request.
create or replace function public.protect_vendor_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is null for service-role connections (admin client,
  -- crons) — always trusted, since that path already bypasses RLS.
  if auth.uid() is not null
     and (new.tier is distinct from old.tier
          or new.is_featured is distinct from old.is_featured
          or new.is_paying is distinct from old.is_paying)
     and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  then
    raise exception 'Only an admin can change a vendor''s package, featured status, or paying status.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_vendor_privileged_columns on public.vendors;
create trigger protect_vendor_privileged_columns
  before update on public.vendors
  for each row
  execute function public.protect_vendor_privileged_columns();
