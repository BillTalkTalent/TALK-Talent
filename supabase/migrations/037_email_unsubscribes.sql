-- Unsubscribe suppression list for bulk/community emails (CAN-SPAM compliance).
-- Anyone here is skipped by the "Email Members" admin composer. Backend-only:
-- read/written by the service-role client, so RLS is on with no public policies.

create table if not exists public.email_unsubscribes (
  email          text primary key,
  unsubscribed_at timestamptz not null default now()
);

alter table public.email_unsubscribes enable row level security;
