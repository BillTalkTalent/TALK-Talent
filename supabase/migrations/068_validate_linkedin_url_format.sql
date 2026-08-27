-- migration 054 required *some* non-empty linkedin_url before approval, but
-- never checked it was actually a LinkedIn URL. In practice that let junk
-- through — a real pending applicant had "hrrps://linedin.c9m/in/..." on
-- file (a typo'd non-domain), which happily satisfied "not empty" while
-- being useless for actually reviewing them. Client-side validation (the
-- signup form's type="url") has the same gap: any syntactically valid URL
-- passes, regardless of domain.
--
-- This is also the one enforcement point that can't be bypassed by calling
-- Supabase's signup API directly instead of going through the site's form
-- (which several recent pending signups appear to have done — blank name,
-- blank linkedin_url, created in rapid bursts). The trigger fires on the
-- approval transition itself regardless of how the row was written, so
-- tightening it here closes that gap for every path, not just the form.
create or replace function public.require_linkedin_for_approval()
returns trigger language plpgsql as $$
begin
  if new.status = 'approved' and not coalesce(new.is_bot, false) then
    if new.linkedin_url is null or trim(new.linkedin_url) = '' then
      raise exception 'Cannot approve % — no LinkedIn URL on file', coalesce(new.email, new.id::text);
    elsif new.linkedin_url !~* '^https?://([a-z0-9-]+\.)*(linkedin\.com|lnkd\.in)(/|$)' then
      raise exception 'Cannot approve % — "%" doesn''t look like a real LinkedIn URL', coalesce(new.email, new.id::text), new.linkedin_url;
    end if;
  end if;
  return new;
end;
$$;
