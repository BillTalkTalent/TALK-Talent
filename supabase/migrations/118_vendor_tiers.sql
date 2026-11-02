-- Vendor packages to sell starting December: Basic (default, free),
-- Pro ($299/mo), Partner ($699/mo). No self-serve checkout yet — Bill
-- closes the sale and sets the tier manually from /admin/vendors; this
-- just gives the tier somewhere to live and something the portal/admin
-- UI can gate on. Setting tier to pro/partner also flips is_featured
-- (one admin action instead of two).
alter table public.vendors
  add column if not exists tier text not null default 'basic' check (tier in ('basic', 'pro', 'partner'));
