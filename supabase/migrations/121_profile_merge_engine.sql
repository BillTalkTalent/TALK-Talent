-- Duplicate member accounts (same person signed up twice under different
-- emails) have come up repeatedly and always required a human to hand-check
-- a long list of tables before it was safe to delete one side. This adds a
-- real primitive for it: merge_profiles(keep_id, remove_id) reassigns every
-- row in every table that has a foreign key into profiles(id) — and
-- *every* table, found by introspecting the schema rather than a hardcoded
-- table list, so it doesn't quietly go stale the next time a feature adds
-- a new profiles-referencing table.
--
-- Scope: this only touches the public schema. Deleting the removed
-- profile's own auth.users row (which cascades its now-empty profiles row,
-- and anything FK'd straight to auth.users like vendor_accounts.id) is the
-- caller's job via the service-role auth admin API — a Postgres function
-- can't reach the auth admin surface.
--
-- Conflict handling: if the keep_id side already has a row that collides
-- with a remove_id row on some unique constraint (e.g. both accounts have
-- a chapter_memberships row for the same chapter), the straight UPDATE
-- fails with unique_violation — caught per table, and the now-redundant
-- remove_id rows are dropped there instead of failing the whole merge.
--
-- service_role only: this is an admin-tool primitive for now. A member-
-- facing self-serve merge flow would wrap this with its own verification
-- (confirm-by-email ownership of the losing account) and business-rule
-- gating (e.g. refuse to touch an admin or vendor-linked account) rather
-- than exposing this raw function to authenticated users directly.

create table if not exists public.profile_merges (
  id uuid default gen_random_uuid() primary key,
  keep_id uuid not null,
  remove_id uuid not null,
  tables_touched jsonb not null default '[]'::jsonb,
  merged_at timestamptz default now(),
  merged_by uuid references public.profiles(id)
);

alter table public.profile_merges enable row level security;

create policy "Admins can view merge history"
  on public.profile_merges for select
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

create or replace function public.merge_profiles(keep_id uuid, remove_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  touched jsonb := '[]'::jsonb;
  n bigint;
begin
  if keep_id is null or remove_id is null then
    raise exception 'keep_id and remove_id are required';
  end if;
  if keep_id = remove_id then
    raise exception 'keep_id and remove_id must be different profiles';
  end if;
  if not exists (select 1 from public.profiles where id = keep_id) then
    raise exception 'keep_id % not found in profiles', keep_id;
  end if;
  if not exists (select 1 from public.profiles where id = remove_id) then
    raise exception 'remove_id % not found in profiles', remove_id;
  end if;

  for rec in
    select distinct
      tc.table_name,
      kcu.column_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name
     and tc.table_schema = ccu.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and ccu.table_schema = 'public'
      and ccu.table_name = 'profiles'
      and ccu.column_name = 'id'
  loop
    begin
      execute format(
        'update public.%I set %I = $1 where %I = $2',
        rec.table_name, rec.column_name, rec.column_name
      ) using keep_id, remove_id;
      get diagnostics n = row_count;
      if n > 0 then
        touched := touched || jsonb_build_object(
          'table', rec.table_name, 'column', rec.column_name, 'rows_moved', n
        );
      end if;
    exception when unique_violation then
      execute format(
        'delete from public.%I where %I = $1',
        rec.table_name, rec.column_name
      ) using remove_id;
      get diagnostics n = row_count;
      touched := touched || jsonb_build_object(
        'table', rec.table_name, 'column', rec.column_name, 'rows_dropped_conflict', n
      );
    end;
  end loop;

  insert into public.profile_merges (keep_id, remove_id, tables_touched, merged_by)
  values (keep_id, remove_id, touched, auth.uid());

  return touched;
end;
$$;

grant execute on function public.merge_profiles(uuid, uuid) to service_role;
