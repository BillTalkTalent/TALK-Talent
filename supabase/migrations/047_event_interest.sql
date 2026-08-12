-- Tracks which event (if any) drove a signup, so the approval flow can drop
-- new members straight back onto the event they wanted instead of the
-- generic dashboard.
alter table public.profiles
  add column interested_event_id uuid references public.events(id) on delete set null;
