-- Migration 032: Add industries_served and company_sizes_served to vendors
-- Also adds slug, tagline, legacy_rating, categories from migration 031
-- (safe to run even if 031 was already applied — uses IF NOT EXISTS)

alter table public.vendors
  add column if not exists slug             text unique,
  add column if not exists tagline          text,
  add column if not exists legacy_rating    numeric(3,2),
  add column if not exists categories       text[] default '{}',
  add column if not exists industries_served text[] default '{}',
  add column if not exists company_sizes_served text[] default '{}';

create unique index if not exists vendors_slug_idx on public.vendors (slug);
