-- Two changes to let a chapter's own leadership team run their chapter
-- without routing every change through a TALK admin:
--
-- 1. Chapter leads can add/remove co-leads for their OWN chapter (a new
--    co-lead must already be a member of that chapter). Admins keep their
--    existing unrestricted "for all" access via migration 017.
--
-- 2. Chapter leads can publish their own chapter's draft events themselves,
--    and keep editing them after publish, instead of every event requiring
--    an admin to flip status. Deleting stays draft-only (migration 063,
--    unchanged) — a lead can't delete an event people may have already
--    registered/paid for.

create policy "Chapter leads can add co-leads for their own chapter"
  on public.chapter_leads for insert
  with check (
    public.is_chapter_lead(chapter_leads.chapter_id)
    and exists (
      select 1 from public.chapter_memberships cm
      where cm.chapter_id = chapter_leads.chapter_id and cm.user_id = chapter_leads.user_id
    )
  );

create policy "Chapter leads can remove co-leads from their own chapter"
  on public.chapter_leads for delete
  using (public.is_chapter_lead(chapter_id));

drop policy if exists "Chapter leads can edit their own chapter's draft events" on public.events;

create policy "Chapter leads can edit their own chapter's events"
  on public.events for update
  using (chapter_id is not null and public.is_chapter_lead(chapter_id))
  with check (chapter_id is not null and public.is_chapter_lead(chapter_id));
