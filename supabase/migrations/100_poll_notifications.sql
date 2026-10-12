-- New polls had no discovery mechanism beyond happening to check the
-- dashboard — no notification when one launches. This adds one, using the
-- exact same async fan-out architecture forum topics already use (migration
-- 090): a trigger does one cheap single-row enqueue, a separate cron does
-- the actual fan-out to every approved member in small batches. A direct
-- bulk insert of ~12,700 notification rows was already confirmed elsewhere
-- in this codebase to hit Postgres's statement_timeout — same risk here,
-- same fix.

create table if not exists public.pending_poll_notifications (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid references public.polls(id) on delete cascade not null,
  question text not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text
);

create index if not exists pending_poll_notifications_unprocessed
  on public.pending_poll_notifications (created_at)
  where processed_at is null;

-- Service-role only (the cron reads/writes via createAdminClient) — same
-- pattern as pending_topic_notifications.
alter table public.pending_poll_notifications enable row level security;

create or replace function public.notify_on_new_poll()
returns trigger language plpgsql security definer as $$
begin
  begin
    insert into public.pending_poll_notifications (poll_id, question, created_by)
    values (NEW.id, NEW.question, NEW.created_by);
  exception when others then
    -- Even the cheap single-row enqueue should never be able to block poll
    -- creation — if it somehow fails, the poll still gets created; it just
    -- won't generate notifications.
    raise warning 'notify_on_new_poll: failed to enqueue notification for poll %: %', NEW.id, sqlerrm;
  end;
  return NEW;
end;
$$;

drop trigger if exists on_poll_created on public.polls;
create trigger on_poll_created
  after insert on public.polls
  for each row execute procedure public.notify_on_new_poll();

alter table public.notification_preferences
  add column if not exists push_new_polls boolean default true;
