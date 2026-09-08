-- Newsletter open/click tracking. The Resend webhook only ever recorded
-- bounces/complaints (deliverability) — nothing measured whether anyone
-- actually read an issue. Resend's email.opened/email.clicked webhook events
-- carry only a `email_id` (the id Resend assigned when the email was sent),
-- not which newsletter it belongs to, so newsletter_recipients is the
-- lookup table that lets the webhook resolve email_id -> (newsletter, email)
-- when those events arrive. newsletter_events is the resulting log.

create table if not exists public.newsletter_recipients (
  id uuid default gen_random_uuid() primary key,
  newsletter_id uuid references public.newsletters(id) on delete cascade not null,
  email text not null,
  resend_email_id text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists newsletter_recipients_newsletter_id_idx on public.newsletter_recipients(newsletter_id);

alter table public.newsletter_recipients enable row level security;

create policy "Admins can manage newsletter recipients"
  on public.newsletter_recipients for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create table if not exists public.newsletter_events (
  id uuid default gen_random_uuid() primary key,
  newsletter_id uuid references public.newsletters(id) on delete cascade not null,
  email text not null,
  event_type text not null check (event_type in ('opened', 'clicked')),
  link_url text,
  resend_email_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists newsletter_events_newsletter_id_idx on public.newsletter_events(newsletter_id);

alter table public.newsletter_events enable row level security;

create policy "Admins can manage newsletter events"
  on public.newsletter_events for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Per-newsletter aggregate (unique opens/clicks, same idiom as counting
-- distinct emails against events that can fire more than once per person).
-- Only ever called via the service-role admin client (same as every other
-- admin read in this app), so no separate grant needed.
create or replace function public.newsletter_engagement_summary()
returns table (
  newsletter_id uuid,
  opens bigint,
  unique_opens bigint,
  clicks bigint,
  unique_clicks bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    newsletter_id,
    count(*) filter (where event_type = 'opened') as opens,
    count(distinct email) filter (where event_type = 'opened') as unique_opens,
    count(*) filter (where event_type = 'clicked') as clicks,
    count(distinct email) filter (where event_type = 'clicked') as unique_clicks
  from public.newsletter_events
  group by newsletter_id;
$$;
