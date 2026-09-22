-- Closes the gap markeb@umich.edu fell through: a pending profile with
-- literally nothing on it (no full_name, no linkedin_url) can only exist
-- if something called Supabase's signUp API directly, bypassing the site's
-- own form. Every legitimate path always provides at least one identity
-- signal:
--   - the site's email signup form requires both full_name and
--     linkedin_url (app/signup/signup-form.tsx)
--   - LinkedIn OAuth always provides a name (given/family or full),
--     though never a profile URL — LinkedIn's OIDC doesn't expose it
--   - the invite tool requires a name (app/api/invite/route.ts), never a
--     LinkedIn URL — that's backfilled by an admin before approval
--   - bot accounts (lib/bot-account.ts) always set full_name at creation
--
-- So the actual bypass signature is "both blank," not "no LinkedIn" —
-- requiring LinkedIn specifically on insert would incorrectly block every
-- real LinkedIn OAuth signup and every admin invite, which never carry one
-- at creation time. Requiring "at least a name or a LinkedIn URL" is the
-- narrower check that actually matches what a real signup always has.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  computed_full_name text;
  computed_linkedin_url text;
begin
  computed_full_name := coalesce(
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'given_name', '') || ' ' || coalesce(new.raw_user_meta_data->>'family_name', '')), '')
  );
  computed_linkedin_url := new.raw_user_meta_data->>'linkedin_url';

  if computed_full_name is null and (computed_linkedin_url is null or trim(computed_linkedin_url) = '') then
    raise exception 'Cannot create profile for % — no name or LinkedIn URL provided', coalesce(new.email, new.id::text);
  end if;

  insert into public.profiles (id, email, full_name, avatar_url, linkedin_url)
  values (
    new.id,
    new.email,
    computed_full_name,
    coalesce(
      nullif(new.raw_user_meta_data->>'avatar_url', ''),
      nullif(new.raw_user_meta_data->>'picture', '')
    ),
    computed_linkedin_url
  );
  return new;
end;
$$;
