-- Events only ever had one free-text `location` field, so admins had to
-- cram both the venue name and the address into it together (the create
-- form literally placeholders "City, Venue"). Splits venue name out as its
-- own field so it can be called out distinctly (e.g. bold venue name, with
-- the address underneath) instead of one run-on string.
alter table public.events add column if not exists venue_name text;
