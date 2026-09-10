-- Tracks whether a guest RSVP has already gotten the post-event "join TALK"
-- nurture email (see /api/cron/guest-nurture), so the daily cron never
-- double-sends to the same guest even if it runs more than once inside its
-- catch-up window.

alter table public.event_guest_rsvps
  add column if not exists nurture_sent_at timestamptz;
