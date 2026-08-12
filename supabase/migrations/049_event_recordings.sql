-- Recording link + supporting materials, browsable after the event so
-- attendees (and anyone else) can go back and watch/download.

alter table public.events add column recording_url text;

create table public.event_materials (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  file_url text not null,
  created_at timestamptz not null default now()
);

alter table public.event_materials enable row level security;

create policy "Materials viewable by approved members"
  on public.event_materials for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and status = 'approved')
  );

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

create policy "Event materials are publicly viewable"
  on storage.objects for select
  using (bucket_id = 'event-materials');

create policy "Admins can upload event materials"
  on storage.objects for insert
  with check (
    bucket_id = 'event-materials'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete event materials"
  on storage.objects for delete
  using (
    bucket_id = 'event-materials'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
