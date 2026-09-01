-- Chapter leads need a way to schedule an internal board meeting without it
-- appearing on the public/all-members events calendar. Adds a binary
-- visibility split on events: 'all' (default, existing behavior unchanged)
-- or 'leads_only' (visible to that chapter's leads, org board members, and
-- admins only).

alter table public.events
  add column if not exists visibility text not null default 'all'
    check (visibility in ('all', 'leads_only'));

-- Regular members' existing policy now also requires visibility = 'all'.
alter policy "Events viewable by approved members"
  on public.events
  using (
    status = 'published'
    and visibility = 'all'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved')
  );

-- Org-wide board members and the hosting chapter's leads can still see a
-- published leads_only event. Leads also see their own chapter's drafts
-- (any visibility) via the pre-existing "Chapter leads can view own chapter
-- events" policy from migration 063, which this doesn't touch.
create policy "Board members and chapter leads can view leads-only events"
  on public.events for select
  using (
    visibility = 'leads_only'
    and status = 'published'
    and (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'board_member')
      or (chapter_id is not null and public.is_chapter_lead(chapter_id))
    )
  );
