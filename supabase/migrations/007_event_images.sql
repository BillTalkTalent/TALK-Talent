-- ============================================================
-- EVENT IMAGES STORAGE BUCKET
-- Run this in the Supabase SQL Editor
-- ============================================================

insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do nothing;

-- Public read
create policy "Event images are publicly viewable"
  on storage.objects for select
  using (bucket_id = 'event-images');

-- Admins can upload event images
create policy "Admins can upload event images"
  on storage.objects for insert
  with check (
    bucket_id = 'event-images'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admins can update event images
create policy "Admins can update event images"
  on storage.objects for update
  using (
    bucket_id = 'event-images'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admins can delete event images
create policy "Admins can delete event images"
  on storage.objects for delete
  using (
    bucket_id = 'event-images'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
