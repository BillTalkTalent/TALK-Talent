-- Guest RSVP (migration 083) defaulted to off, so every new event needed an
-- admin to remember to flip it on — real events (e.g. the Boston coffee
-- meetup) kept shipping with it off, silently forcing non-members to
-- "Apply to join TALK" instead of the no-membership RSVP flow that's the
-- whole point of this feature. Flip the default to on for new events; this
-- only changes what a fresh row gets when the column isn't specified — it
-- does not touch allow_guest_rsvp on any existing event.

alter table public.events
  alter column allow_guest_rsvp set default true;
