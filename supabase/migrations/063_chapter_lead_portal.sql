-- Chapter lead portal, phase 1: give events a chapter and let a chapter's
-- leads create/edit events for it. Per the agreed workflow, lead-created
-- events stay DRAFT until a TALK admin publishes them — a lead's RLS access
-- is intentionally limited to rows they can still see as drafts of their
-- own chapter; once an admin flips status to 'published' it drops out of
-- the lead's update/delete policies (which both require status = 'draft'),
-- handing control to the admin-only "for all" policy from migration 001.
-- Co-lead management (who else can be a chapter_leads row) stays admin-only
-- and is intentionally untouched here.

alter table public.events
  add column if not exists chapter_id uuid references public.chapters(id) on delete set null;

create index if not exists events_chapter_id_idx on public.events(chapter_id);

-- SECURITY DEFINER so it bypasses RLS on chapter_leads internally, matching
-- the pattern from migration 062 — chapter_leads' own policies aren't
-- self-referential so this isn't strictly required to avoid recursion, but
-- it keeps every "is this person a lead of this chapter" check identical
-- instead of repeating the exists(...) subquery in five different policies.
create or replace function public.is_chapter_lead(p_chapter_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.chapter_leads cl
    where cl.chapter_id = p_chapter_id and cl.user_id = p_user_id
  );
$$;

grant execute on function public.is_chapter_lead(uuid, uuid) to authenticated;

-- Members already see published events platform-wide via the existing
-- "Events viewable by approved members" policy (status = 'published' only).
-- Leads additionally need to see their own chapter's drafts to manage them.
create policy "Chapter leads can view own chapter events"
  on public.events for select
  using (chapter_id is not null and public.is_chapter_lead(chapter_id));

create policy "Chapter leads can create draft events for their chapter"
  on public.events for insert
  with check (
    organizer_id = auth.uid()
    and status = 'draft'
    and chapter_id is not null
    and public.is_chapter_lead(chapter_id)
  );

create policy "Chapter leads can edit their own chapter's draft events"
  on public.events for update
  using (chapter_id is not null and status = 'draft' and public.is_chapter_lead(chapter_id))
  with check (chapter_id is not null and status = 'draft' and public.is_chapter_lead(chapter_id));

create policy "Chapter leads can delete their own chapter's draft events"
  on public.events for delete
  using (chapter_id is not null and status = 'draft' and public.is_chapter_lead(chapter_id));
