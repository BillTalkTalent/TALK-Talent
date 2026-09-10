-- Rate-limiting for the public /api/events/[id]/guest-rsvp endpoint. Guest
-- RSVP now defaults to on for every event (migration 086), which widens the
-- surface a bot could hit compared to when it was opt-in per event — this
-- closes that gap the same way 035_recovery_rate_limit.sql already does for
-- the password-recovery endpoint (service-role client bypasses RLS, so RLS
-- is enabled with no policies to keep the table backend-only).

create table if not exists public.guest_rsvp_attempts (
  id uuid primary key default gen_random_uuid(),
  ip text,
  event_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists guest_rsvp_attempts_ip_time on public.guest_rsvp_attempts (ip, created_at desc);

alter table public.guest_rsvp_attempts enable row level security;
