-- Founders Hub, phase 3: a general discussion board for things that aren't
-- a structured suggestion. Modeled directly on chapter_posts /
-- chapter_post_replies (migration 017) — same shape, same RLS approach,
-- just gated on is_founding_member/admin instead of chapter membership.
create table if not exists public.founder_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists founder_posts_created_idx on public.founder_posts(created_at desc);

alter table public.founder_posts enable row level security;

create policy "Founding members and admins can view posts"
  on public.founder_posts for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (p.is_founding_member or p.role = 'admin')
  ));

create policy "Founding members and admins can post"
  on public.founder_posts for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.is_founding_member or p.role = 'admin')
    )
  );

create policy "Authors can edit own posts"
  on public.founder_posts for update
  using (auth.uid() = author_id);

create policy "Authors and admins can delete posts"
  on public.founder_posts for delete
  using (
    auth.uid() = author_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create trigger founder_posts_updated_at
  before update on public.founder_posts
  for each row execute function public.handle_updated_at();

create table if not exists public.founder_post_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.founder_posts(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists founder_post_replies_post_idx on public.founder_post_replies(post_id);

alter table public.founder_post_replies enable row level security;

create policy "Founding members and admins can view replies"
  on public.founder_post_replies for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (p.is_founding_member or p.role = 'admin')
  ));

create policy "Founding members and admins can reply"
  on public.founder_post_replies for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.is_founding_member or p.role = 'admin')
    )
  );

create policy "Authors can edit own replies"
  on public.founder_post_replies for update
  using (auth.uid() = author_id);

create policy "Authors and admins can delete replies"
  on public.founder_post_replies for delete
  using (
    auth.uid() = author_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
