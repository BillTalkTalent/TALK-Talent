-- Lets admins publish a catalog of sponsorship opportunities (newsletter
-- placements, event sponsorships, etc.) with indicative pricing, which
-- paying vendors browse from their portal and express interest in. No
-- checkout — an inquiry just lands in the admin review queue, same shape
-- as vendor_leads, since sponsorship deals are still negotiated by hand.

create table if not exists public.sponsorship_opportunities (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  price_label text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.sponsorship_opportunities enable row level security;

create policy "Admins can manage sponsorship opportunities"
  on public.sponsorship_opportunities for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "Vendor accounts can view active sponsorship opportunities"
  on public.sponsorship_opportunities for select
  using (is_active and exists (select 1 from public.vendor_accounts va where va.id = auth.uid()));

create table if not exists public.sponsorship_inquiries (
  id uuid default gen_random_uuid() primary key,
  opportunity_id uuid references public.sponsorship_opportunities(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete cascade not null,
  created_by uuid references public.vendor_accounts(id) on delete set null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'contacted', 'booked', 'declined')),
  created_at timestamptz not null default now()
);

create index if not exists sponsorship_inquiries_vendor_id_idx on public.sponsorship_inquiries(vendor_id);

alter table public.sponsorship_inquiries enable row level security;

create policy "Admins can manage sponsorship inquiries"
  on public.sponsorship_inquiries for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Reuses the is_active_vendor_account() helper from migration 077 so a
-- vendor can only inquire about (or see) their own vendor's inquiries,
-- and only while they're still an active paying account.
create policy "Vendor accounts can view their own sponsorship inquiries"
  on public.sponsorship_inquiries for select
  using (public.is_active_vendor_account(vendor_id));

create policy "Vendor accounts can submit their own sponsorship inquiries"
  on public.sponsorship_inquiries for insert
  with check (public.is_active_vendor_account(vendor_id) and created_by = auth.uid());
