-- Support for the TA news digest bot (auto-posted) and the admin news-brief
-- assistant (drafts a post for a human to review and publish).
--
-- is_bot marks automated accounts so the UI can disclose them clearly —
-- members should never mistake a bot post for a real person's.
--
-- Written to be safe to re-run in full from any partial state.

alter table public.profiles add column if not exists is_bot boolean not null default false;

-- Category the bot posts into. Also selectable by admins for manual posts.
insert into public.forum_categories (name, description, slug, icon, sort_order)
values (
  'Industry News',
  'Daily Talent Acquisition news, hiring trends, and labor market updates.',
  'industry-news',
  '📰',
  0
)
on conflict (slug) do nothing;
