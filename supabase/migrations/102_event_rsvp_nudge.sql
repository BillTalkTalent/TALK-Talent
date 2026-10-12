-- Only 13-29 members RSVP to the weekly discussion out of ~12,800 approved
-- members — most never get prompted at all unless they happen to open the
-- Monday newsletter or Thursday digest. This adds a one-time-per-event
-- in-app nudge to everyone who hasn't RSVP'd, sent 2 days out by the new
-- app/api/cron/rsvp-nudge cron. No new queue table needed (unlike
-- migrations 090/100/101) — this isn't insert-triggered, it's a daily
-- calendar check, so the cron does the batched fan-out directly.

alter table public.events
  add column if not exists rsvp_nudge_sent_at timestamptz;

-- Reuses the existing "push_events" preference (notification_preferences,
-- already defaulted true) rather than adding a new one — that toggle has
-- been sitting in notification settings since the mentions/forum build-out
-- with nothing actually wired to it.
