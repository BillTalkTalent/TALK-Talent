-- Founders Hub, phase 5: volunteer opportunities. Modeled directly on
-- sponsorship_opportunities / sponsorship_inquiries (migration 080) — admin
-- posts a need, members express interest; no checkout, just a signup record
-- admin can see. A founding member only ever sees their OWN signup rows,
-- same privacy shape as a vendor only seeing its own inquiries.
create table if not exists public.founder_opportunities (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.founder_opportunities enable row level security;

create policy "Admins can manage volunteer opportunities"
  on public.founder_opportunities for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "Founding members can view active volunteer opportunities"
  on public.founder_opportunities for select
  using (
    is_active
    and exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_founding_member or p.role = 'admin'))
  );

create table if not exists public.founder_volunteer_signups (
  id uuid default gen_random_uuid() primary key,
  opportunity_id uuid references public.founder_opportunities(id) on delete cascade not null,
  member_id uuid references public.profiles(id) on delete cascade not null,
  note text,
  created_at timestamptz not null default now(),
  unique (opportunity_id, member_id)
);

create index if not exists founder_volunteer_signups_opportunity_idx on public.founder_volunteer_signups(opportunity_id);

alter table public.founder_volunteer_signups enable row level security;

create policy "Admins can manage volunteer signups"
  on public.founder_volunteer_signups for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "Founding members can view their own signups"
  on public.founder_volunteer_signups for select
  using (member_id = auth.uid());

create policy "Founding members can sign up"
  on public.founder_volunteer_signups for insert
  with check (
    member_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_founding_member or p.role = 'admin'))
  );

create policy "Founding members can withdraw their own signup"
  on public.founder_volunteer_signups for delete
  using (member_id = auth.uid());
