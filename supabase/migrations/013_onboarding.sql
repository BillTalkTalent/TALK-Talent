-- Track whether a member has completed onboarding
alter table profiles add column if not exists has_onboarded boolean not null default false;

-- Mark existing approved members as already onboarded
update profiles set has_onboarded = true where status = 'approved';
