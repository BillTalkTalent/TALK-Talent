-- Founders Hub, phase 4: a shared file/recording library. One table, a
-- `kind` column distinguishes the two per the scope doc: 'file' rows point
-- at an object in the founder-files bucket (by storage path, not a public
-- URL), 'recording' rows point at an external link (YouTube/Loom/Drive) —
-- Supabase storage isn't built for hosting video at scale.
--
-- Unlike vendor-logos (public — logos are meant to be seen by anyone
-- browsing the vendor directory), founder-files is a PRIVATE bucket: this
-- content is explicitly invite-only, so a guessed or leaked object URL must
-- not work. The app reads it via short-lived signed URLs generated through
-- the authenticated client, which only succeeds because of the storage RLS
-- policies below.
create table if not exists public.founder_files (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('file', 'recording')) default 'file',
  title text not null,
  description text,
  url text not null,
  created_at timestamptz not null default now()
);

create index if not exists founder_files_kind_idx on public.founder_files(kind);

alter table public.founder_files enable row level security;

create policy "Founding members and admins can view file records"
  on public.founder_files for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (p.is_founding_member or p.role = 'admin')
  ));

create policy "Founding members and admins can add file records"
  on public.founder_files for insert
  with check (
    auth.uid() = uploaded_by
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.is_founding_member or p.role = 'admin')
    )
  );

create policy "Uploaders and admins can delete file records"
  on public.founder_files for delete
  using (
    auth.uid() = uploaded_by
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

insert into storage.buckets (id, name, public)
values ('founder-files', 'founder-files', false)
on conflict (id) do nothing;

create policy "Founding members and admins can upload founder files"
  on storage.objects for insert
  with check (
    bucket_id = 'founder-files'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.is_founding_member or p.role = 'admin')
    )
  );

create policy "Founding members and admins can read founder files"
  on storage.objects for select
  using (
    bucket_id = 'founder-files'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.is_founding_member or p.role = 'admin')
    )
  );

create policy "Uploaders and admins can delete founder files"
  on storage.objects for delete
  using (
    bucket_id = 'founder-files'
    and (
      owner = auth.uid()
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    )
  );
