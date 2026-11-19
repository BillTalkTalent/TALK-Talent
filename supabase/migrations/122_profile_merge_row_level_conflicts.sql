-- merge_profiles (121) did one bulk `UPDATE ... WHERE col = remove_id` per
-- table. Tested against a real conflict case (a person with two chapter
-- memberships, one of which collided with the kept profile's existing
-- membership) and found: Postgres rolls the WHOLE statement back on the
-- first unique_violation, so the fallback DELETE then drops every row for
-- that person in the table — not just the conflicting one. A clean,
-- non-conflicting row that should have transferred was silently lost.
--
-- Fix: loop row-by-row (identified by ctid, since the FK column is never
-- the table's own primary key) so a single collision only drops that one
-- row. Every other row for the removed profile still moves over.
create or replace function public.merge_profiles(keep_id uuid, remove_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  row_rec record;
  touched jsonb := '[]'::jsonb;
  moved_count bigint;
  dropped_count bigint;
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
    moved_count := 0;
    dropped_count := 0;

    for row_rec in
      execute format('select ctid from public.%I where %I = $1', rec.table_name, rec.column_name)
      using remove_id
    loop
      begin
        execute format('update public.%I set %I = $1 where ctid = $2', rec.table_name, rec.column_name)
        using keep_id, row_rec.ctid;
        moved_count := moved_count + 1;
      exception when unique_violation then
        execute format('delete from public.%I where ctid = $1', rec.table_name)
        using row_rec.ctid;
        dropped_count := dropped_count + 1;
      end;
    end loop;

    if moved_count > 0 or dropped_count > 0 then
      touched := touched || jsonb_build_object(
        'table', rec.table_name,
        'column', rec.column_name,
        'rows_moved', moved_count,
        'rows_dropped_conflict', dropped_count
      );
    end if;
  end loop;

  insert into public.profile_merges (keep_id, remove_id, tables_touched, merged_by)
  values (keep_id, remove_id, touched, auth.uid());

  return touched;
end;
$$;
