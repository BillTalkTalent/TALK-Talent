-- ============================================================
-- Migration 024: Legacy member import staging
-- Holds the 10,624 members scraped from talktalent.com.
-- When an existing member signs up on the new platform and is
-- approved, the application layer can match them by linkedin_url
-- and pre-fill their profile from this table.
-- ============================================================

create table if not exists public.legacy_member_staging (
  id                  uuid primary key default uuid_generate_v4(),
  legacy_user_id      text,                        -- UUID from legacy /api/v1/profiles (p.id)
  legacy_profile_id   text,                        -- UUID from legacy attributes.id
  first_name          text,
  last_name           text,
  job_title           text,
  company_name        text,
  company_industry    text,
  company_size        text,
  ta_level            text,
  linkedin_url        text,
  group_name          text,                        -- e.g. "National", "Boston"
  board_member        boolean default false,
  avatar_url          text,
  -- set once a real profile is matched/created
  matched_profile_id  uuid references public.profiles(id) on delete set null,
  imported_at         timestamptz default now()
);

create index if not exists legacy_member_staging_linkedin_idx
  on public.legacy_member_staging (linkedin_url)
  where linkedin_url is not null;

create index if not exists legacy_member_staging_matched_idx
  on public.legacy_member_staging (matched_profile_id)
  where matched_profile_id is not null;

-- Admins only — no public RLS needed
alter table public.legacy_member_staging enable row level security;

create policy "Admins can manage legacy staging"
  on public.legacy_member_staging for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );


-- ============================================================
-- Helper: call this when a new member is approved to auto-fill
-- their profile from legacy staging data (matched by linkedin_url).
-- Usage: select public.match_legacy_member('<profile_id>');
-- ============================================================
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
    avatar_url = coalesce(nullif(avatar_url, ''), v_staging.avatar_url)
  where id = p_profile_id;

  -- Mark staging record as matched
  update public.legacy_member_staging
  set matched_profile_id = p_profile_id
  where id = v_staging.id;

  return true;
end;
$$;
