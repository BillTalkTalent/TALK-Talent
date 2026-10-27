-- Bill wants to approve a real member (Abel Solis) who genuinely doesn't
-- have or use LinkedIn — require_linkedin_for_approval (migrations 054/068)
-- blocks that outright, by design, to stop junk signups from slipping
-- through. Rather than disabling that trigger (even briefly, platform-wide)
-- to push one person through, this adds an explicit, auditable per-person
-- exemption a super admin can set, reusable for the next legitimate case.
alter table public.profiles
  add column if not exists linkedin_exempt boolean not null default false;

create or replace function public.require_linkedin_for_approval()
returns trigger language plpgsql as $$
begin
  if new.status = 'approved' and not coalesce(new.is_bot, false) and not coalesce(new.linkedin_exempt, false) then
    if TG_OP = 'UPDATE' and OLD.status = 'approved' then
      return new;
    end if;

    if new.linkedin_url is null or trim(new.linkedin_url) = '' then
      raise exception 'Cannot approve % — no LinkedIn URL on file', coalesce(new.email, new.id::text);
    elsif new.linkedin_url !~* '^https?://([a-z0-9-]+\.)*(linkedin\.com|lnkd\.in)(/|$)' then
      raise exception 'Cannot approve % — "%" doesn''t look like a real LinkedIn URL', coalesce(new.email, new.id::text), new.linkedin_url;
    end if;
  end if;
  return new;
end;
$$;
