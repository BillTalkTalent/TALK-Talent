-- Founders Hub (scope doc: "Founders Hub — Scope"): an invite-only area for
-- the founding members helping Bill rebuild/relaunch TALK. They're TALK
-- members first — this is extra surface on top of their normal account, not
-- a separate login like vendor_accounts (migration 076). A single additive
-- flag, same shape as linkedin_exempt (migration 106): no new RLS pattern,
-- just "is this true."
alter table public.profiles
  add column if not exists is_founding_member boolean not null default false;
