-- Allow anonymous poll votes so migrated legacy tallies can be stored as real
-- poll_votes rows (one row per vote) rather than only aggregate counts. The
-- legacy export has no voter identity, so these rows carry user_id = NULL and
-- is_anonymous = true — genuinely anonymous, never falsely pinned to a member.
alter table public.poll_votes alter column user_id drop not null;
alter table public.poll_votes add column if not exists is_anonymous boolean not null default false;

-- The unique(poll_id, option_id, user_id) constraint still holds; Postgres treats
-- NULLs as distinct, so many anonymous rows per option are allowed. Real member
-- votes continue to set user_id as before.
