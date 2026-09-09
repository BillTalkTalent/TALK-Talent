-- Guest RSVP: lets an event (opted in per-event via allow_guest_rsvp) accept
-- RSVPs from people who aren't TALK members — no account, no approval gate.
-- Deliberately a separate table from event_rsvps (which is keyed to a real
-- profiles row) so this never intersects with member-only RLS policies —
-- same reasoning as vendor_accounts/vendor_leads earlier. LinkedIn URL is
-- required: for a TA-leader community, that's the one piece of professional
-- context worth capturing even without full membership vetting.

alter table public.events
  add column if not exists allow_guest_rsvp boolean not null default false;

create table if not exists public.event_guest_rsvps (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  full_name text not null,
  email text not null,
  linkedin_url text not null,
  status text not null default 'going' check (status in ('going', 'cancelled')),
  created_at timestamptz not null default now()
);

create unique index if not exists event_guest_rsvps_event_email_idx
  on public.event_guest_rsvps(event_id, lower(email));
create index if not exists event_guest_rsvps_event_id_idx on public.event_guest_rsvps(event_id);

alter table public.event_guest_rsvps enable row level security;

create policy "Admins can manage event guest RSVPs"
  on public.event_guest_rsvps for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
