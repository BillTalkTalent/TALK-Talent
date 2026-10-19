-- The newsletter/digest spotlight always picked the chronologically soonest
-- upcoming event. That breaks when two events land the same week (e.g. a
-- casual chapter meet-and-greet at 11am the same day as the week's real
-- discussion at 1pm) — pure date ordering spotlighted the meet-and-greet
-- instead of the event actually worth a member's attention.
alter table public.events
  add column if not exists newsletter_feature boolean not null default false;
