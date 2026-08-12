-- When a new signup recognizes themself among possible existing-profile
-- matches (different email than what's on file), this records which
-- profile they claim to be. Left for admin review during approval rather
-- than merging automatically — see app/admin/page.tsx confirmMatch.
alter table public.profiles
  add column claimed_match_id uuid references public.profiles(id) on delete set null;
