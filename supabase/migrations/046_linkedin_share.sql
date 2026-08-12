-- LinkedIn posting connection per member. Holds the raw LinkedIn access
-- token needed to post on a member's behalf, so it must never be reachable
-- by the client SDK. RLS is enabled with no policies at all, which denies
-- both anon and authenticated roles by default — only the service-role key
-- (used server-side in app/api/linkedin/*) can read or write this table.
create table public.linkedin_connections (
  user_id uuid references auth.users(id) on delete cascade primary key,
  access_token text not null,
  member_urn text not null,
  connected_at timestamptz not null default now()
);

alter table public.linkedin_connections enable row level security;
