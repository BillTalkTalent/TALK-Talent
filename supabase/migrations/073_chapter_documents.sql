-- Board Docs: a private, leads-only document library per chapter — files
-- (bylaws, budgets, planning docs) plus meeting minutes, all scoped to that
-- chapter's own leads/board and org admins. Nothing here is visible to
-- regular members.

create table if not exists public.chapter_documents (
  id uuid default gen_random_uuid() primary key,
  chapter_id uuid references public.chapters(id) on delete cascade not null,
  title text not null,
  category text not null default 'document' check (category in ('document', 'minutes')),
  file_path text not null,
  file_name text not null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists chapter_documents_chapter_id_idx on public.chapter_documents(chapter_id);

alter table public.chapter_documents enable row level security;

create policy "Chapter leads and admins can view their chapter's documents"
  on public.chapter_documents for select
  using (
    public.is_chapter_lead(chapter_id)
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Chapter leads and admins can upload documents"
  on public.chapter_documents for insert
  with check (
    (
      public.is_chapter_lead(chapter_id)
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    )
    and uploaded_by = auth.uid()
  );

create policy "Chapter leads and admins can delete documents"
  on public.chapter_documents for delete
  using (
    public.is_chapter_lead(chapter_id)
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ============================================================
-- CHAPTER DOCUMENTS STORAGE BUCKET (private — unlike event-images/
-- event-materials, board docs are never publicly readable)
-- ============================================================

insert into storage.buckets (id, name, public)
values ('chapter-documents', 'chapter-documents', false)
on conflict (id) do nothing;

-- Uploads are always written under "<chapter_id>/<file>" (enforced by the
-- app, not the DB) so these policies can scope storage access to the same
-- chapter the object belongs to, purely from its path.
create policy "Chapter leads and admins can read chapter document files"
  on storage.objects for select
  using (
    bucket_id = 'chapter-documents'
    and (
      public.is_chapter_lead((split_part(name, '/', 1))::uuid)
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
  );

create policy "Chapter leads and admins can upload chapter document files"
  on storage.objects for insert
  with check (
    bucket_id = 'chapter-documents'
    and (
      public.is_chapter_lead((split_part(name, '/', 1))::uuid)
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
  );

create policy "Chapter leads and admins can delete chapter document files"
  on storage.objects for delete
  using (
    bucket_id = 'chapter-documents'
    and (
      public.is_chapter_lead((split_part(name, '/', 1))::uuid)
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
  );

-- ============================================================
-- Incidental fix, found while building the above: the event-images bucket
-- (migration 007) only ever let admins upload/update/delete, so a chapter
-- lead creating an event with a cover image via the chapter Manage panel's
-- event form (added later, migration 063) has been silently unable to
-- upload the image this whole time. Widen it to any chapter lead too —
-- that bucket isn't chapter-scoped by path, so this is "any lead of any
-- chapter," matching the existing "any admin" breadth of the policies it
-- replaces.
-- ============================================================

drop policy if exists "Admins can upload event images" on storage.objects;
create policy "Admins and chapter leads can upload event images"
  on storage.objects for insert
  with check (
    bucket_id = 'event-images'
    and (
      exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      or exists (select 1 from public.chapter_leads where user_id = auth.uid())
    )
  );

drop policy if exists "Admins can update event images" on storage.objects;
create policy "Admins and chapter leads can update event images"
  on storage.objects for update
  using (
    bucket_id = 'event-images'
    and (
      exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      or exists (select 1 from public.chapter_leads where user_id = auth.uid())
    )
  );

drop policy if exists "Admins can delete event images" on storage.objects;
create policy "Admins and chapter leads can delete event images"
  on storage.objects for delete
  using (
    bucket_id = 'event-images'
    and (
      exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      or exists (select 1 from public.chapter_leads where user_id = auth.uid())
    )
  );
