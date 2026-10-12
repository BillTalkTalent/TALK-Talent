-- New job posts had no discovery mechanism beyond happening to check the
-- jobs board — no notification when one went up. Only 8 jobs have ever
-- been posted (1 in the last 30 days), so the board is likely underused
-- partly because nobody knows when something new appears. Same async
-- fan-out architecture as forum topics (migration 090) and polls
-- (migration 100): a trigger does one cheap single-row enqueue, a separate
-- cron does the actual fan-out to every approved member in small batches —
-- a direct bulk insert at full member count was already confirmed
-- elsewhere in this codebase to hit Postgres's statement_timeout.

create table if not exists public.pending_job_notifications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.job_posts(id) on delete cascade not null,
  title text not null,
  company text not null,
  poster_id uuid,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text
);

create index if not exists pending_job_notifications_unprocessed
  on public.pending_job_notifications (created_at)
  where processed_at is null;

-- Service-role only (the cron reads/writes via createAdminClient) — same
-- pattern as pending_topic_notifications / pending_poll_notifications.
alter table public.pending_job_notifications enable row level security;

create or replace function public.notify_on_new_job()
returns trigger language plpgsql security definer as $$
begin
  begin
    insert into public.pending_job_notifications (job_id, title, company, poster_id)
    values (NEW.id, NEW.title, NEW.company, NEW.poster_id);
  exception when others then
    -- Even the cheap single-row enqueue should never be able to block a
    -- job posting — if it somehow fails, the job still gets created; it
    -- just won't generate notifications.
    raise warning 'notify_on_new_job: failed to enqueue notification for job %: %', NEW.id, sqlerrm;
  end;
  return NEW;
end;
$$;

drop trigger if exists on_job_posted on public.job_posts;
create trigger on_job_posted
  after insert on public.job_posts
  for each row execute procedure public.notify_on_new_job();

alter table public.notification_preferences
  add column if not exists push_new_jobs boolean default true;
