-- Bill wants email + LinkedIn URL mandatory for TALK membership. Email is
-- already fully enforced (not null on the column, and Supabase Auth itself
-- requires one to sign up at all) — this only needs to add linkedin_url.
--
-- Enforcing this at profile *creation* would break two other flows that
-- also insert into profiles without a linkedin_url on hand yet: the
-- "invite a colleague" admin flow (app/api/invite/route.ts) and the
-- automated bot account (lib/bot-account.ts) — neither collects one at
-- that point. Instead this gates the *approval* transition specifically:
-- a member can't become 'approved' without a linkedin_url on file,
-- regardless of which path created their (still-pending) profile row.
-- Bots are exempt.

create or replace function public.require_linkedin_for_approval()
returns trigger language plpgsql as $$
begin
  if new.status = 'approved' and not coalesce(new.is_bot, false) then
    if new.linkedin_url is null or trim(new.linkedin_url) = '' then
      raise exception 'Cannot approve % — no LinkedIn URL on file', coalesce(new.email, new.id::text);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_require_linkedin_for_approval on public.profiles;
create trigger profiles_require_linkedin_for_approval
  before insert or update on public.profiles
  for each row execute function public.require_linkedin_for_approval();

-- The auto-create-profile trigger (migration 001) only ever inserted id,
-- email, full_name, avatar_url — linkedin_url was added a moment later by
-- a separate client-side upsert from the signup form. Pass it through
-- signup metadata instead (same way full_name already works), so the
-- profile row has it from the very first insert.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, linkedin_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    new.raw_user_meta_data->>'linkedin_url'
  );
  return new;
end;
$$;
