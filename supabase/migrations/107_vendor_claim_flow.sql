-- Bill wants to invite all 483 directory vendors to claim their listing,
-- not just paying ones — editing the basic listing (name/description/
-- category/website/contact/logo) should be free once claimed. The paying
-- gate (migration 076/077) stays exactly where it is for the premium stuff:
-- posting vendor_updates and sponsorship inquiries.

-- Same SECURITY DEFINER sidestep as is_active_vendor_account (077) — a
-- plain RLS subquery from vendor_accounts into vendors would silently see
-- zero rows without it, and every write would fail with no error.
create or replace function public.is_claimed_vendor_account(p_vendor_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.vendor_accounts va
    where va.id = p_user_id and va.vendor_id = p_vendor_id
  );
$$;

grant execute on function public.is_claimed_vendor_account(uuid, uuid) to authenticated;

drop policy if exists "Paying vendor accounts can update their own listing" on public.vendors;
create policy "Claimed vendor accounts can update their own listing"
  on public.vendors for update
  using (public.is_claimed_vendor_account(id))
  with check (public.is_claimed_vendor_account(id));

drop policy if exists "Paying vendor accounts can upload their own logo" on storage.objects;
create policy "Claimed vendor accounts can upload their own logo"
  on storage.objects for insert
  with check (
    bucket_id = 'vendor-logos'
    and public.is_claimed_vendor_account((split_part(name, '/', 1))::uuid)
  );

-- Self-serve claim requests — a visitor with no TALK account and no
-- existing vendor_account finds their company (via a direct link Bill
-- sends in outreach) and asks to manage it. Public insert, same no-login
-- pattern as event_guest_rsvps — an admin reviews and approves before any
-- vendor_accounts row (and therefore any login) gets created.
create table if not exists public.vendor_claim_requests (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.vendors(id) on delete cascade not null,
  full_name text not null,
  email text not null,
  title text,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);

create index if not exists vendor_claim_requests_vendor_id_idx on public.vendor_claim_requests(vendor_id);
create index if not exists vendor_claim_requests_pending_idx on public.vendor_claim_requests(created_at) where status = 'pending';

alter table public.vendor_claim_requests enable row level security;

create policy "Anyone can submit a vendor claim request"
  on public.vendor_claim_requests for insert
  with check (true);

create policy "Admins can manage vendor claim requests"
  on public.vendor_claim_requests for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
