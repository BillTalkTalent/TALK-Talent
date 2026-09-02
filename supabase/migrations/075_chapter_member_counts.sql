-- The /chapters list page counted member per chapter by fetching every
-- chapter_memberships row client-side and reducing it in JS. That silently
-- undercounts once total memberships pass PostgREST's default 1000-row cap
-- on unbounded selects — true today (13,764 rows platform-wide) — so every
-- chapter card's member count has been wrong, not just Boston's. A real
-- GROUP BY aggregate avoids both the cap and shipping thousands of rows to
-- the browser just to count them.

create or replace function public.chapter_member_counts()
returns table(chapter_id uuid, member_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select chapter_id, count(*) as member_count
  from public.chapter_memberships
  group by chapter_id;
$$;

grant execute on function public.chapter_member_counts() to authenticated;
