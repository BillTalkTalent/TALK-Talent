-- Preference toggles for @mention notifications in the forum — kept
-- separate from push_forum_replies/email_forum_replies (migration 030) so
-- someone can turn off general reply notifications but still hear when
-- they're specifically tagged, or vice versa. wants()/loadPrefs()
-- (lib/notification-prefs.ts) already default any missing key to true, so
-- this is safe to add without a backfill.
alter table public.notification_preferences
  add column if not exists email_mentions boolean default true,
  add column if not exists push_mentions boolean default true;
