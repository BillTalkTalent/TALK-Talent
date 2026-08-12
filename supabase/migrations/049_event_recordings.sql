-- Recording link + supporting materials, browsable after the event so
-- attendees (and anyone else) can go back and watch/download.
--
-- Written to be safe to re-run in full from any partial state (add
-- column/create table if-not-exists, drop-then-create for policies, which
-- don't support IF NOT EXISTS in Postgres).

alter table public.events add column if not exists recording_url text;

create table if not exists public.event_materials (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  file_url text not null,
  created_at timestamptz not null default now()
);

alter table public.event_materials enable row level security;

drop policy if exists "Materials viewable by approved members" on public.event_materials;
create policy "Materials viewable by approved members"
  on public.event_materials for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and status = 'approved')
  );

drop policy if exists "Admins can manage materials" on public.event_materials;
create policy "Admins can manage materials"
  on public.event_materials for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ============================================================
-- EVENT MATERIALS STORAGE BUCKET
-- ============================================================

insert into storage.buckets (id, name, public)
values ('event-materials', 'event-materials', true)
on conflict (id) do nothing;

drop policy if exists "Event materials are publicly viewable" on storage.objects;
create policy "Event materials are publicly viewable"
  on storage.objects for select
  using (bucket_id = 'event-materials');

drop policy if exists "Admins can upload event materials" on storage.objects;
create policy "Admins can upload event materials"
  on storage.objects for insert
  with check (
    bucket_id = 'event-materials'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Admins can delete event materials" on storage.objects;
create policy "Admins can delete event materials"
  on storage.objects for delete
  using (
    bucket_id = 'event-materials'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
