-- 1. Add board_member to the role enum
alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('member', 'board_member', 'admin'));

-- 2. Chapter leads: which board members run which chapters
create table public.chapter_leads (
  id uuid default gen_random_uuid() primary key,
  chapter_id uuid references public.chapters(id) on delete cascade not null,
  user_id   uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique (chapter_id, user_id)
);

alter table public.chapter_leads enable row level security;

create policy "Chapter leads viewable by approved members"
  on public.chapter_leads for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'approved'
  ));

create policy "Admins manage chapter leads"
  on public.chapter_leads for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ));

-- 3. Chapter posts: local communication board per chapter
create table public.chapter_posts (
  id         uuid default gen_random_uuid() primary key,
  chapter_id uuid references public.chapters(id) on delete cascade not null,
  author_id  uuid references public.profiles(id) on delete set null,
  title      text not null,
  body       text not null,
  is_pinned  boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.chapter_posts enable row level security;

create policy "Chapter posts viewable by approved members"
  on public.chapter_posts for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'approved'
  ));

create policy "Chapter members and board members can post"
  on public.chapter_posts for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.status = 'approved'
    )
  );

create policy "Authors can edit own posts"
  on public.chapter_posts for update
  using (auth.uid() = author_id);

create policy "Authors and admins can delete posts"
  on public.chapter_posts for delete
  using (
    auth.uid() = author_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'board_member')
    )
  );

create trigger chapter_posts_updated_at
  before update on public.chapter_posts
  for each row execute procedure public.handle_updated_at();

-- 4. Chapter post replies
create table public.chapter_post_replies (
  id        uuid default gen_random_uuid() primary key,
  post_id   uuid references public.chapter_posts(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete set null,
  body      text not null,
  created_at timestamptz default now()
);

alter table public.chapter_post_replies enable row level security;

create policy "Replies viewable by approved members"
  on public.chapter_post_replies for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'approved'
  ));

create policy "Approved members can reply"
  on public.chapter_post_replies for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.status = 'approved'
    )
  );

create policy "Authors can edit own replies"
  on public.chapter_post_replies for update
  using (auth.uid() = author_id);

create policy "Authors and admins can delete replies"
  on public.chapter_post_replies for delete
  using (
    auth.uid() = author_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'board_member')
    )
  );
