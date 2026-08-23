-- Newsletter sponsors used to be a single slot reused for all three ad spots
-- (top masthead, mid banner, bottom offer) — fine when there was one sponsor,
-- but promoting the same vendor three times in one email makes no sense once
-- there's a second sponsor. Split into two independently-active placements:
-- 'masthead' (top "Presented by" + bottom special-offer, as before) and 'mid'
-- (the mid-newsletter banner). One sponsor runs per placement at a time, same
-- "newest un-expired wins" rule as before, just scoped per placement now.
alter table public.newsletter_sponsors
  add column if not exists placement text not null default 'masthead'
  check (placement in ('masthead', 'mid'));
