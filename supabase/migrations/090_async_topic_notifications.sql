-- 089's exception-handling fix was insufficient: reproduced directly against
-- production data that a single INSERT of ~12,700 rows into notifications
-- (the size of notify_on_forum_topic's synchronous fan-out to every approved
-- member) hits Postgres's statement_timeout on its own — a plain bulk insert
-- with no trigger involved timed out the same way. A statement-timeout
-- cancel re-fires on every subsequent check within that same top-level
-- statement, so wrapping the fan-out in `exception when others` inside the
-- trigger doesn't reliably let the rest of the transaction finish once the
-- deadline is blown — the forum_topics insert itself still fails. This is
-- why creating a topic can fail with a generic "Failed to create topic,"
-- and it's a function of current member volume, not specific to any one
-- forum category (confirmed nothing about the DEI in Talent category
-- differs from any other).
--
-- Real fix: decouple the fan-out from the synchronous insert path entirely.
-- The trigger now does one cheap single-row insert into a queue table; a
-- new cron (/api/cron/process-topic-notifications) does the actual fan-out
-- afterward, in small batches, outside the request/transaction that's
-- creating the topic.

create table if not exists public.pending_topic_notifications (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references public.forum_topics(id) on delete cascade not null,
  category_id uuid,
  category_slug text,
  category_name text,
  title text not null,
  author_id uuid,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text
);

create index if not exists pending_topic_notifications_unprocessed
  on public.pending_topic_notifications (created_at)
  where processed_at is null;

-- Service-role only (the cron reads/writes via createAdminClient) — same
-- pattern as activity_snapshots/linkedin_connections.
alter table public.pending_topic_notifications enable row level security;

create or replace function public.notify_on_forum_topic()
returns trigger language plpgsql security definer as $$
declare
  cat_slug text;
  cat_name text;
begin
  select slug, name into cat_slug, cat_name
  from public.forum_categories
  where id = NEW.category_id;

  begin
    insert into public.pending_topic_notifications
      (topic_id, category_id, category_slug, category_name, title, author_id)
    values
      (NEW.id, NEW.category_id, cat_slug, cat_name, NEW.title, NEW.author_id);
  exception when others then
    -- Even the cheap single-row enqueue should never be able to block topic
    -- creation — if it somehow fails, the topic still gets created; that
    -- one topic just won't generate notifications.
    raise warning 'notify_on_forum_topic: failed to enqueue notification for topic %: %', NEW.id, sqlerrm;
  end;

  return NEW;
end;
$$;
