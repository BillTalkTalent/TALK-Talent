-- Fix notifications INSERT policy: the previous policy used `with check (true)` which
-- allowed any authenticated user to insert notifications for any user.
-- Service_role bypasses RLS entirely, so only service_role can insert
-- (API routes that use createAdminClient), and the DB trigger (security definer) works too.
-- Removing the too-permissive policy closes the hole.

drop policy if exists "Service role can insert notifications" on public.notifications;
