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

-- The profiles_require_linkedin_for_approval trigger (migration 054/068)
-- fires on ANY update to a row, not just an approval attempt, and
-- re-validates the whole row's status/linkedin_url format every time.
-- Turns out the legacy data here is messier than one exclusion clause can
-- keep up with — confirmed live that just the avatar_url='' subset alone
-- has 771 approved rows with either no linkedin_url or one that doesn't
-- match the required format (most commonly missing "https://", plus a
-- long tail of outright garbage values like "n/a" or a plain name typed
-- into the field). This UPDATE only ever touches full_name/avatar_url —
-- it has nothing to do with what this trigger checks — so the correct fix
-- is to bypass that trigger for this narrow, well-understood operation
-- rather than trying to replicate its exact validation rule in a WHERE
-- clause (which is exactly what broke twice already). Wrapped in an
-- explicit transaction so the trigger can't end up stuck disabled if
-- only part of this script gets run.
begin;

alter table public.profiles disable trigger profiles_require_linkedin_for_approval;

update public.profiles set full_name = null where full_name = '';
update public.profiles set avatar_url = null where avatar_url = '';

alter table public.profiles enable trigger profiles_require_linkedin_for_approval;

commit;

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
