-- Newsletter sponsorships sold as a time-based service (outside the vendor
-- directory). The single active sponsor (expires_at not past, newest) is
-- auto-included in every newsletter sent during its window: a "Presented by"
-- masthead at the top, plus an optional "Special offer" callout at the bottom
-- (with a teaser up top pointing to it).
create table if not exists public.newsletter_sponsors (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  logo_url text,
  url text,
  blurb text,
  offer text,                         -- special-offer description (optional)
  offer_url text,                     -- CTA link for the offer (falls back to url)
  offer_cta text,                     -- button label (defaults to "Claim offer")
  expires_at date not null,           -- "runs until" (inclusive)
  created_at timestamptz not null default now()
);

alter table public.newsletter_sponsors enable row level security;

create policy "Admins manage newsletter sponsors"
  on public.newsletter_sponsors for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Per-edition opt-out of the active sponsor.
alter table public.newsletters add column if not exists skip_sponsor boolean not null default false;
