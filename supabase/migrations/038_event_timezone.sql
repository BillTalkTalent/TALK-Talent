-- Events need an explicit timezone so times display unambiguously for a
-- membership spread across North America (and beyond). event_date/end_date
-- stay timestamptz (an absolute UTC instant); this column records the zone the
-- organizer scheduled it in, so we can show "2:00 PM EDT" everywhere and also
-- convert to each viewer's local time.
alter table public.events
  add column if not exists timezone text not null default 'America/New_York';
