-- Members had no self-service way to take down their own job post or set
-- an expiration — only an admin could close/delete a listing (app/admin/jobs),
-- and nothing auto-expired a stale posting. This adds an optional
-- expires_at the poster sets when creating/editing their own listing, and
-- makes the public "active jobs" visibility check itself expiry-aware
-- (not just reliant on a cron flipping status in time) so a stale listing
-- never shows to members even if a scheduled job is delayed or skipped.

alter table public.job_posts
  add column if not exists expires_at timestamptz null;

drop policy if exists "Approved members can view active jobs" on public.job_posts;

create policy "Approved members can view active jobs"
  on public.job_posts for select
  using (
    status = 'active'
    and (expires_at is null or expires_at > now())
    and auth.uid() is not null
  );

-- Without this, a poster who closes their own listing (or lets it expire)
-- can no longer see it at all — the policy above only shows active,
-- unexpired rows to everyone, poster included. A self-service "close" or
-- "reopen" control needs the poster to still be able to load the page.
create policy "Posters can view their own listings regardless of status"
  on public.job_posts for select
  using (auth.uid() = poster_id);
