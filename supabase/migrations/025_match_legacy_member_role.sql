-- Migration 025: Update match_legacy_member to also back-fill board_member role
-- when a legacy staging record marks the member as a board member.

create or replace function public.match_legacy_member(p_profile_id uuid)
returns boolean
language plpgsql security definer as $$
declare
  v_linkedin text;
  v_staging  public.legacy_member_staging%rowtype;
begin
  select linkedin_url into v_linkedin
  from public.profiles where id = p_profile_id;

  if v_linkedin is null then
    return false;
  end if;

  select * into v_staging
  from public.legacy_member_staging
  where linkedin_url = v_linkedin
    and matched_profile_id is null
  limit 1;

  if not found then
    return false;
  end if;

  -- Back-fill any blank fields on the profile
  update public.profiles set
    full_name  = coalesce(nullif(full_name, ''),  v_staging.first_name || ' ' || v_staging.last_name),
    title      = coalesce(nullif(title, ''),      v_staging.job_title),
    company    = coalesce(nullif(company, ''),    v_staging.company_name),
    avatar_url = coalesce(nullif(avatar_url, ''), v_staging.avatar_url),
    -- Upgrade to board_member if legacy data says so (never downgrade)
    role       = case
                   when v_staging.board_member = true and role = 'member' then 'board_member'
                   else role
                 end
  where id = p_profile_id;

  -- Mark staging record as matched
  update public.legacy_member_staging
  set matched_profile_id = p_profile_id
  where id = v_staging.id;

  return true;
end;
$$;
