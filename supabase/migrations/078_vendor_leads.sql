-- Prospective-vendor applications from the public /partners landing page.
-- Submissions go through an API route using the service-role client (no
-- session exists on that public page), so there's no public insert policy
-- here — only admins ever read/write this table directly.

create table if not exists public.vendor_leads (
  id uuid default gen_random_uuid() primary key,
  company_name text not null,
  contact_name text,
  contact_email text not null,
  website text,
  message text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'contacted', 'declined')),
  created_at timestamptz not null default now()
);

alter table public.vendor_leads enable row level security;

create policy "Admins can manage vendor leads"
  on public.vendor_leads for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
