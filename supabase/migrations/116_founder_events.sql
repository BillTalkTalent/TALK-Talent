-- Founders Hub, phase 7: a founders-only calendar.
--
-- Deliberately NOT built on the shared public.events table. That table's
-- RLS only gates on "published + approved member" — a founders-only flag
-- bolted on would also need threading through event_rsvps' insert policy,
-- every admin-bypassing cron that reads events (reminders, digest,
-- rsvp-nudge, guest-nurture), the public guest-rsvp teaser route, and
-- chapter-level event creation. A small dedicated table, following the
-- same layered-ownership shape as founder_opportunities (migration 114),
-- is the much lower-risk path to the same outcome.
create table if not exists public.founder_events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  location text,
  is_virtual boolean not null default false,
  virtual_url text,
  event_date timestamptz not null,
  end_date timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists founder_events_event_date_idx on public.founder_events(event_date);

alter table public.founder_events enable row level security;

create policy "Founding members and admins can view founder events"
  on public.founder_events for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (p.is_founding_member or p.role = 'admin')
  ));

create policy "Founding members and admins can post founder events"
  on public.founder_events for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.is_founding_member or p.role = 'admin')
    )
  );

create policy "Creators and admins can edit founder events"
  on public.founder_events for update
  using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Creators and admins can delete founder events"
  on public.founder_events for delete
  using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- RSVPs are visible to the whole group (same as the main app's
-- event_rsvps policy) — unlike volunteer signups, which were deliberately
-- private, knowing who else is coming to a meetup is the point.
create table if not exists public.founder_event_rsvps (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.founder_events(id) on delete cascade not null,
  member_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique (event_id, member_id)
);

create index if not exists founder_event_rsvps_event_idx on public.founder_event_rsvps(event_id);

alter table public.founder_event_rsvps enable row level security;

create policy "Founding members and admins can view founder event rsvps"
  on public.founder_event_rsvps for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (p.is_founding_member or p.role = 'admin')
  ));

create policy "Founding members can rsvp to founder events"
  on public.founder_event_rsvps for insert
  with check (
    member_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_founding_member or p.role = 'admin'))
  );

create policy "Founding members can withdraw their own rsvp"
  on public.founder_event_rsvps for delete
  using (member_id = auth.uid());
