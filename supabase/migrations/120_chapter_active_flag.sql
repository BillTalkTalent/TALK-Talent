-- Admin chapter management can now archive a chapter (retire it from the
-- member-facing list) without deleting it outright — deleting would cascade
-- away chapter_memberships and chapter_leads history for no good reason.
alter table public.chapters
  add column if not exists is_active boolean not null default true;
