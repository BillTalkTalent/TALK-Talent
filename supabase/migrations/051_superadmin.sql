-- Second admin tier: is_superadmin is a flag layered on top of role='admin'
-- rather than a new role value. Every existing RLS policy and app-level check
-- that tests role = 'admin' keeps working unchanged for the super admin — this
-- avoids having to rewrite the ~30 RLS policies scattered across earlier
-- migrations that hardcode role = 'admin', and the risk of missing one and
-- silently locking the super admin out of something.
--
-- Written to be safe to re-run in full from any partial state.

alter table public.profiles add column if not exists is_superadmin boolean not null default false;

-- Bill is the super admin (god mode). Also ensures his role is 'admin' in case
-- it drifted, since is_superadmin without role='admin' would be meaningless.
update public.profiles set role = 'admin', is_superadmin = true where email = 'bill@talktalent.com';
