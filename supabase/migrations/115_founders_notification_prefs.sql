-- Founders Hub activity notifications, two tiers matching how forum
-- mentions vs. replies already split (migration 097): "someone posted
-- something new" is low-signal and in-app only by default; "someone
-- replied to YOUR post" or "your idea's status changed" is the
-- closing-the-loop signal worth an email by default. wants()/loadPrefs()
-- (lib/notification-prefs.ts) already default any missing key to the
-- caller-supplied default, so this is safe to add without a backfill.
alter table public.notification_preferences
  add column if not exists email_founders_activity boolean default false,
  add column if not exists push_founders_activity boolean default true,
  add column if not exists email_founders_replies boolean default true,
  add column if not exists push_founders_replies boolean default true;
