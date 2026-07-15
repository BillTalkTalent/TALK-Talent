-- Rate-limiting for the public /api/auth/recovery endpoint (email-send abuse guard).
-- The endpoint uses the service-role client, which bypasses RLS — so RLS is enabled
-- with no policies to keep the table private to the backend.

create table if not exists public.recovery_attempts (
  id uuid primary key default gen_random_uuid(),
  ip text,
  email text,
  created_at timestamptz not null default now()
);

create index if not exists recovery_attempts_email_time on public.recovery_attempts (email, created_at desc);
create index if not exists recovery_attempts_ip_time on public.recovery_attempts (ip, created_at desc);

alter table public.recovery_attempts enable row level security;
