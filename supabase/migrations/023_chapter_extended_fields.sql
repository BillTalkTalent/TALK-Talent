-- Extend chapters with richer editable profile fields
alter table public.chapters
  add column if not exists long_description text,
  add column if not exists banner_url       text,
  add column if not exists website_url      text,
  add column if not exists contact_email    text;

-- Allow chapter leads to update their own chapter's editable fields
create policy "Chapter leads can update their chapter"
  on public.chapters for update
  using (
    exists (
      select 1 from public.chapter_leads cl
      join public.profiles p on p.id = auth.uid()
      where cl.chapter_id = chapters.id
        and cl.user_id = auth.uid()
        and p.status = 'approved'
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.chapter_leads cl
      join public.profiles p on p.id = auth.uid()
      where cl.chapter_id = chapters.id
        and cl.user_id = auth.uid()
        and p.status = 'approved'
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
