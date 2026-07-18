-- Notification preferences for poll activity (comments + votes).
alter table public.notification_preferences add column if not exists email_poll_comments boolean default true;
alter table public.notification_preferences add column if not exists push_poll_comments  boolean default true;
alter table public.notification_preferences add column if not exists push_poll_votes      boolean default true;
