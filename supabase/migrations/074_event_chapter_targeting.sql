-- Lets an event (typically a national/admin-created one) also surface on
-- one or more local chapters' own pages, without disturbing the existing
-- single "owning" chapter_id (used for chapter-lead edit permissions,
-- leads_only visibility, etc — untouched here).
--
-- No RLS changes needed: which chapter(s) an event is tagged to doesn't
-- gate who can see it (that's status + visibility, already covered by the
-- existing policies) — this column only affects which chapter page(s) it's
-- displayed on.

alter table public.events
  add column if not exists additional_chapter_ids uuid[] not null default '{}';

create index if not exists events_additional_chapter_ids_idx on public.events using gin (additional_chapter_ids);
