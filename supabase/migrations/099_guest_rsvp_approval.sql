-- Guest RSVP went straight to "going" with an instant confirmation email —
-- no review step. This adds a real approval gate: a guest RSVP now starts
-- as 'pending', gets a "we got your RSVP" holding email (no calendar invite,
-- no venue/virtual-link details yet), and only becomes 'going' — with the
-- actual confirmation email + calendar invite — once an admin approves it
-- from /admin/guest-rsvps. 'rejected' is the explicit decline state (no
-- email sent on rejection for now — that wording is Bill's call, not
-- something to invent here).

alter table public.event_guest_rsvps
  drop constraint if exists event_guest_rsvps_status_check;

alter table public.event_guest_rsvps
  add constraint event_guest_rsvps_status_check
  check (status in ('pending', 'going', 'cancelled', 'rejected'));

alter table public.event_guest_rsvps
  alter column status set default 'pending';
