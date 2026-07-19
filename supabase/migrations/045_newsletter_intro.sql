-- Optional custom opening message (a founder's note / edition theme) shown
-- right after the greeting. Falls back to the standard roundup line when blank.
alter table public.newsletters add column if not exists intro text;
