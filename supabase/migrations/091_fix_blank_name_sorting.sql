-- Blank profiles were sorting to the FRONT of the member directory, not the
-- back — an empty string ('') sorts before any letter in the default
-- collation, so `.order('full_name')` put every no-name profile first. Two
-- fixes:
--
-- 1. Normalize existing empty-string full_name/avatar_url to NULL (empty
--    and "no value" mean the same thing here, and NULL is what
--    `nullsFirst: false` in the members page's query actually checks for).
-- 2. Close the one remaining path that can still produce a literal ''
--    instead of NULL: handle_new_user()'s LinkedIn-OAuth fallback
--    (migration 070) used '' as its final coalesce default. Now that
--    the invite form requires a name (see the invite-flow fix), OAuth
--    signups with no name/given_name/family_name from LinkedIn are the
--    only remaining source of a blank name — coalesce now falls through
--    to NULL instead.

-- The profiles_require_linkedin_for_approval trigger (migration 054) fires
-- on ANY update to a row, not just an approval attempt — it re-validates
-- the whole row's status/linkedin_url every time. There are 740+ approved
-- members with no LinkedIn URL on file, mostly older legacy-migrated
-- accounts that were approved before that trigger existed and have simply
-- never been updated since (so it never got a chance to complain). A
-- blanket UPDATE here would touch some of those rows too and get blocked
-- by the trigger — confirmed live (lmelton@genesco.com). Excluding
-- anything in that state from these two updates avoids the conflict;
-- fixing the underlying 740-row LinkedIn gap is a separate, much bigger
-- question, not something to bundle into this fix.
update public.profiles set full_name = null
  where full_name = ''
    and not (status = 'approved' and (linkedin_url is null or trim(linkedin_url) = ''));
update public.profiles set avatar_url = null
  where avatar_url = ''
    and not (status = 'approved' and (linkedin_url is null or trim(linkedin_url) = ''));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, linkedin_url)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      nullif(trim(coalesce(new.raw_user_meta_data->>'given_name', '') || ' ' || coalesce(new.raw_user_meta_data->>'family_name', '')), '')
    ),
    coalesce(
      nullif(new.raw_user_meta_data->>'avatar_url', ''),
      nullif(new.raw_user_meta_data->>'picture', '')
    ),
    new.raw_user_meta_data->>'linkedin_url'
  );
  return new;
end;
$$;

-- Tracks whether a no-name profile has already gotten the "complete your
-- profile" nudge email (see /api/cron/incomplete-profile-nudge), so it's
-- sent once per profile, not every time the cron runs.
alter table public.profiles
  add column if not exists profile_nudge_sent_at timestamptz;
