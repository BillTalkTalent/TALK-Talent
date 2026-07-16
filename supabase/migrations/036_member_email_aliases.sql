-- Maps a member's secondary emails (professional / personal, from the migration
-- export) to their primary login email, so the claim/reset flow can find their
-- account no matter which of their addresses they remember. Backend-only:
-- the recovery endpoint reads it with the service-role client (bypasses RLS).

create table if not exists public.member_email_aliases (
  alias_email   text primary key,
  primary_email text not null,
  created_at    timestamptz not null default now()
);

alter table public.member_email_aliases enable row level security;
