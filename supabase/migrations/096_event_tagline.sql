-- Short one-line tagline for events, shown between the title and the full
-- description everywhere an event appears (create/edit forms, event detail,
-- events list, chapter pages, newsletter, reminder emails). Lets the title
-- stay short and scannable while still carrying a bit more context than the
-- title alone, without forcing a reader into the full description.
alter table public.events
  add column if not exists tagline text;
