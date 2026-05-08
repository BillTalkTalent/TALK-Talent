-- ============================================================
-- VENDOR LOGOS STORAGE BUCKET
-- Run this in the Supabase SQL Editor
-- ============================================================

insert into storage.buckets (id, name, public)
values ('vendor-logos', 'vendor-logos', true)
on conflict (id) do nothing;

create policy "Vendor logos are publicly viewable"
  on storage.objects for select
  using (bucket_id = 'vendor-logos');

create policy "Admins can upload vendor logos"
  on storage.objects for insert
  with check (
    bucket_id = 'vendor-logos'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update vendor logos"
  on storage.objects for update
  using (
    bucket_id = 'vendor-logos'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can delete vendor logos"
  on storage.objects for delete
  using (
    bucket_id = 'vendor-logos'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
