alter table public.events
  add column if not exists event_type text not null default 'in_person'
  check (event_type in ('in_person','webinar','hybrid'));

create table if not exists public.event_posts (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete set null,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.event_posts enable row level security;
create policy "Approved members can view event posts" on public.event_posts for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved'));
create policy "Approved members can post on events" on public.event_posts for insert
  with check (auth.uid() = author_id and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved'));
create policy "Authors can delete own event posts" on public.event_posts for delete using (auth.uid() = author_id);
create trigger event_posts_updated_at before update on public.event_posts
  for each row execute function public.handle_updated_at();
