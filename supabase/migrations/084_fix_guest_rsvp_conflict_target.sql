-- Fixes a real bug in migration 083: the unique index was on
-- (event_id, lower(email)), but the guest-rsvp route's upsert specifies
-- on_conflict=event_id,email — Postgres only matches ON CONFLICT against a
-- constraint on the literal columns named, not a functional index, so every
-- guest RSVP failed with 42P10 ("no unique or exclusion constraint matching
-- the ON CONFLICT specification"). The route already lowercases email before
-- writing, so a plain unique constraint on the literal columns is both
-- correct and matches the conflict target.

drop index if exists event_guest_rsvps_event_email_idx;

alter table public.event_guest_rsvps
  add constraint event_guest_rsvps_event_email_key unique (event_id, email);
