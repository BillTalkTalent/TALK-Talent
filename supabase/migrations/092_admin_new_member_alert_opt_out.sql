-- Both admins (currently Bill and John Anderson of RecruitiFi) get emailed
-- on every new membership application via notify-admin-signup. John asked
-- to stop receiving those specifically, without losing his admin role or
-- his in-app notification — a per-admin toggle instead of a hardcoded
-- email exclusion in the route, so it's self-service and reversible from
-- the data alone if another admin ever wants the same.
alter table public.profiles
  add column if not exists receive_new_member_alerts boolean not null default true;
