-- Vendor updates need admin approval before members see them — a vendor
-- posting straight to their public listing page with no review step was
-- too open. Existing rows default to 'approved' so nothing already live
-- disappears; new posts default to 'pending'.

alter table public.vendor_updates
  add column if not exists status text not null default 'pending' check (status in ('pending', 'approved', 'rejected'));

update public.vendor_updates set status = 'approved' where created_at < now();

-- Replace the members-can-view policy so it only surfaces approved posts.
-- The vendor's own "manage their own updates" policy (migration 076) is
-- untouched — a vendor still sees and can delete their own regardless of
-- status. Admins already have their own unrestricted "manage" policy.
drop policy if exists "Approved members can view vendor updates" on public.vendor_updates;
create policy "Approved members can view vendor updates"
  on public.vendor_updates for select
  using (
    status = 'approved'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved')
  );
