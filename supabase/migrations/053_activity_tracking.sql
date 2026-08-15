-- Lightweight in-app analytics: route-level navigation and daily activity
-- rollups. Deliberately not a third-party tool (PostHog/Hotjar) — this
-- captures "what section did they visit" and "how are the north-star
-- numbers trending", not click/scroll-level heatmaps, using only data
-- this app can already see.

-- page_views: one row per route navigation for a signed-in member. Powers
-- the "most visited sections" / "where members are going" view in
-- /admin/activity. RLS only allows a member to insert their own row —
-- there is no select policy, so reads are service-role (admin) only.
create table if not exists public.page_views (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  path text not null,
  created_at timestamptz not null default now()
);

create index if not exists page_views_created_at_idx on public.page_views (created_at);
create index if not exists page_views_user_id_idx on public.page_views (user_id);

alter table public.page_views enable row level security;

drop policy if exists "Members can log their own page views" on public.page_views;
create policy "Members can log their own page views"
  on public.page_views for insert
  with check (auth.uid() = user_id);

-- activity_snapshots: one row per day of the north-star numbers shown on
-- /admin/activity, so the dashboard can show a real trend instead of a
-- single point-in-time snapshot. Written by a daily cron
-- (app/api/cron/activity-snapshot), read by the admin dashboard — both via
-- the service-role client. RLS is enabled with no policies at all, which
-- denies both anon and authenticated roles by default (same pattern as
-- linkedin_connections in migration 046).
create table if not exists public.activity_snapshots (
  id uuid default gen_random_uuid() primary key,
  snapshot_date date not null unique,
  approved_members integer not null,
  engaged_members integer not null,
  active_today integer not null,
  active_this_week integer not null,
  active_this_month integer not null,
  engagement_rate numeric not null,
  usage_rate_30d numeric not null,
  stickiness_rate numeric not null,
  created_at timestamptz not null default now()
);

alter table public.activity_snapshots enable row level security;
