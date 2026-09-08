-- Fixes a real bug found while testing migration 076 live: the update
-- policy on `vendors` and the manage policy on `vendor_updates` both
-- referenced `vendors` from inside a subquery, but no policy granted a
-- vendor account SELECT on `vendors` at all — so those subqueries silently
-- saw zero rows and every write was blocked, with no error (a plain RLS
-- non-match on UPDATE, unlike the explicit rejection INSERT gets).
--
-- Fixed with a SECURITY DEFINER helper (same pattern as is_chapter_lead()
-- from migration 063) that checks vendor_accounts + vendors.is_paying with
-- elevated privileges, sidestepping the cross-table RLS visibility problem
-- entirely, plus an explicit SELECT policy so the vendor portal's own
-- dashboard page can actually read the listing it's editing.

create or replace function public.is_active_vendor_account(p_vendor_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.vendor_accounts va
    join public.vendors v on v.id = va.vendor_id
    where va.id = p_user_id and va.vendor_id = p_vendor_id and v.is_paying
  );
$$;

grant execute on function public.is_active_vendor_account(uuid, uuid) to authenticated;

drop policy if exists "Paying vendor accounts can update their own listing" on public.vendors;
create policy "Paying vendor accounts can update their own listing"
  on public.vendors for update
  using (public.is_active_vendor_account(id))
  with check (public.is_active_vendor_account(id));

create policy "Vendor accounts can view their own listing"
  on public.vendors for select
  using (exists (select 1 from public.vendor_accounts va where va.id = auth.uid() and va.vendor_id = vendors.id));

drop policy if exists "Paying vendor accounts can manage their own updates" on public.vendor_updates;
create policy "Paying vendor accounts can manage their own updates"
  on public.vendor_updates for all
  using (public.is_active_vendor_account(vendor_id))
  with check (public.is_active_vendor_account(vendor_id));

-- Same fix for the logo-upload storage policy — it had the identical
-- vendors-join problem.
drop policy if exists "Paying vendor accounts can upload their own logo" on storage.objects;
create policy "Paying vendor accounts can upload their own logo"
  on storage.objects for insert
  with check (
    bucket_id = 'vendor-logos'
    and public.is_active_vendor_account((split_part(name, '/', 1))::uuid)
  );
