-- require_linkedin_for_approval (migrations 054/068) was documented as
-- gating the approval *transition* ("a member can't become 'approved'
-- without a linkedin_url on file") but actually checked `new.status =
-- 'approved'` unconditionally on every update — so any unrelated edit to an
-- already-approved member (industry, title, name, anything) failed outright
-- if their linkedin_url was blank or didn't match the stricter regex added
-- later in 068, even though nothing about their approval was changing.
-- Confirmed live: a batch industry/company_size backfill on 9 San Diego
-- members errored with "Cannot approve X" despite never touching status.
create or replace function public.require_linkedin_for_approval()
returns trigger language plpgsql as $$
begin
  if new.status = 'approved' and not coalesce(new.is_bot, false) then
    -- Already approved and staying approved — not an approval transition,
    -- so don't re-validate a field that has nothing to do with this write.
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
