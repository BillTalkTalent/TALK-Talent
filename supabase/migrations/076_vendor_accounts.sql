-- Vendor self-service: a paying vendor gets a scoped account — NOT a full
-- TALK member/profiles row — that can edit only their own vendor listing and
-- post updates the community can see. Kept structurally separate from
-- `profiles` on purpose, so a vendor account never intersects with the ~30
-- RLS policies built around member roles/status, and never shows up in the
-- member directory, forum, jobs, chat, etc.

alter table public.vendors
  add column if not exists is_paying boolean not null default false;

create table if not exists public.vendor_accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete cascade not null,
  full_name text,
  email text not null,
  created_at timestamptz not null default now()
);

create index if not exists vendor_accounts_vendor_id_idx on public.vendor_accounts(vendor_id);

alter table public.vendor_accounts enable row level security;

create policy "Vendor account holders can view their own account"
  on public.vendor_accounts for select
  using (id = auth.uid());

create policy "Admins can manage vendor accounts"
  on public.vendor_accounts for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- A vendor account holder can edit their own listing, but only while it's
-- flagged paying — "paying" is the gate, flipped by an admin after payment
-- is handled outside the app (no self-service billing yet).
create policy "Paying vendor accounts can update their own listing"
  on public.vendors for update
  using (
    is_paying
    and exists (select 1 from public.vendor_accounts va where va.id = auth.uid() and va.vendor_id = vendors.id)
  )
  with check (
    is_paying
    and exists (select 1 from public.vendor_accounts va where va.id = auth.uid() and va.vendor_id = vendors.id)
  );

-- The "share things with the community" piece — a lightweight update feed
-- attached to the vendor's own listing page, deliberately not forum posting
-- rights (the forum stays real-conversation-between-members only).
create table if not exists public.vendor_updates (
  id uuid default gen_random_uuid() primary key,
  vendor_id uuid references public.vendors(id) on delete cascade not null,
  title text not null,
  body text,
  link_url text,
  created_by uuid references public.vendor_accounts(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists vendor_updates_vendor_id_idx on public.vendor_updates(vendor_id);

alter table public.vendor_updates enable row level security;

-- Same visibility as the vendor directory itself — approved members only.
create policy "Approved members can view vendor updates"
  on public.vendor_updates for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved'));

create policy "Paying vendor accounts can manage their own updates"
  on public.vendor_updates for all
  using (
    exists (
      select 1 from public.vendor_accounts va
      join public.vendors v on v.id = va.vendor_id
      where va.id = auth.uid() and va.vendor_id = vendor_updates.vendor_id and v.is_paying
    )
  )
  with check (
    exists (
      select 1 from public.vendor_accounts va
      join public.vendors v on v.id = va.vendor_id
      where va.id = auth.uid() and va.vendor_id = vendor_updates.vendor_id and v.is_paying
    )
  );

create policy "Admins can manage vendor updates"
  on public.vendor_updates for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- The vendor-logos bucket (migration 009) has only ever allowed admin
-- uploads — same gap as event-images before it. A paying vendor uploading
-- their own logo writes to "<vendor_id>/<file>" so this can be scoped to
-- their own listing without touching the existing admin-uploads-anywhere
-- policy.
create policy "Paying vendor accounts can upload their own logo"
  on storage.objects for insert
  with check (
    bucket_id = 'vendor-logos'
    and exists (
      select 1 from public.vendor_accounts va
      join public.vendors v on v.id = va.vendor_id
      where va.id = auth.uid() and v.is_paying and va.vendor_id::text = split_part(name, '/', 1)
    )
  );
