-- Migration 031: Add enrichment columns to vendors for legacy import
-- Adds slug, tagline, legacy_rating, and a categories array

alter table public.vendors
  add column if not exists slug text unique,
  add column if not exists tagline text,
  add column if not exists legacy_rating numeric(3,2),
  add column if not exists categories text[] default '{}';

-- Index for slug lookups
create unique index if not exists vendors_slug_idx on public.vendors (slug);
