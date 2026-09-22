-- notify_on_forum_topic() (migrations 016/090) fans a new topic out to
-- EVERY approved member regardless of category — fine for platform-wide
-- categories (General Discussion, Industry News, etc.), but wrong for the
-- 9 topic-based chapter categories (Executive & Leadership, DEI in Talent,
-- Tech & AI, ...), which now get a weekly bot-posted prompt
-- (app/api/cron/chapter-weekly-prompt) on top of any organic posts. A DEI
-- in Talent post has no reason to notify all ~12,800 approved members when
-- only a few hundred are actually in that chapter.
--
-- Fix: link forum_categories to the chapter they belong to (only the 9
-- topic-type chapters have one; everything else stays platform-wide), and
-- have new-topic notifications go to just that chapter's members when a
-- link exists. Verified live that forum_categories.slug = 'chapter-' ||
-- chapters.slug holds for all 9 current topic chapters before relying on
-- it here.

alter table public.forum_categories
  add column if not exists chapter_id uuid references public.chapters(id) on delete set null;

update public.forum_categories fc
set chapter_id = c.id
from public.chapters c
where fc.slug = 'chapter-' || c.slug
  and c.type = 'topic';

alter table public.pending_topic_notifications
  add column if not exists chapter_id uuid references public.chapters(id) on delete set null;

create or replace function public.notify_on_forum_topic()
returns trigger language plpgsql security definer as $$
declare
  cat_slug text;
  cat_name text;
  cat_chapter_id uuid;
begin
  select slug, name, chapter_id into cat_slug, cat_name, cat_chapter_id
  from public.forum_categories
  where id = NEW.category_id;

  begin
    insert into public.pending_topic_notifications
      (topic_id, category_id, category_slug, category_name, chapter_id, title, author_id)
    values
      (NEW.id, NEW.category_id, cat_slug, cat_name, cat_chapter_id, NEW.title, NEW.author_id);
  exception when others then
    raise warning 'notify_on_forum_topic: failed to enqueue notification for topic %: %', NEW.id, sqlerrm;
  end;

  return NEW;
end;
$$;
