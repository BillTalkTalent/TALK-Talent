-- Some events (e.g. a chapter's happy hour) run RSVPs split across TALK and
-- a separate platform like Luma — the "N going" count on the public event
-- page only ever counted TALK-side RSVPs (event_rsvps + event_guest_rsvps),
-- silently undercounting real attendance for a split event. This is a real,
-- admin-entered count of attendees confirmed elsewhere, not a fabricated
-- number — it exists so the public page reflects true total attendance
-- instead of just whichever platform happened to record the RSVP.

alter table public.events
  add column if not exists external_attendee_count integer not null default 0
  check (external_attendee_count >= 0);
