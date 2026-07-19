-- Records every bounce/complaint Resend reports (via the /api/webhooks/resend
-- webhook), so the list self-cleans and we can later recover job-changers by
-- re-sending to their alternate email. Backend-only: written by the service-role
-- webhook handler, so RLS is on with no public policies.
create table if not exists public.email_bounces (
  id uuid default uuid_generate_v4() primary key,
  email text not null,
  event_type text not null,          -- 'bounced' | 'complained'
  bounce_type text,                  -- 'Permanent' | 'Transient' | null
  bounce_subtype text,
  reason text,
  suppressed boolean not null default false,
  raw jsonb,
  created_at timestamptz not null default now()
);

create index if not exists email_bounces_email_idx on public.email_bounces(email);

alter table public.email_bounces enable row level security;
