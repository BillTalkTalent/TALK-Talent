-- Founders Hub, phase 2: idea capture + topic suggestions as one unified
-- table (same shape — title, body, status, votes — so one UI covers both,
-- filtered by type). Visibility/write checks mirror chapter_posts
-- (migration 017): a plain exists() against profiles.id = auth.uid() needs
-- no SECURITY DEFINER helper, since reading your own profiles row is
-- already covered by the standing self-select policy.
create table if not exists public.founder_suggestions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('idea', 'topic')),
  title text not null,
  body text,
  status text not null default 'new' check (status in ('new', 'under_review', 'planned', 'shipped', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists founder_suggestions_type_idx on public.founder_suggestions(type);
create index if not exists founder_suggestions_status_idx on public.founder_suggestions(status);

alter table public.founder_suggestions enable row level security;

create policy "Founding members and admins can view suggestions"
  on public.founder_suggestions for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (p.is_founding_member or p.role = 'admin')
  ));

create policy "Founding members and admins can submit suggestions"
  on public.founder_suggestions for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.is_founding_member or p.role = 'admin')
    )
  );

-- Status changes (closing the loop) are admin-only — a founding member
-- submits and votes, but doesn't move their own idea to "planned."
create policy "Admins manage suggestion status"
  on public.founder_suggestions for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "Admins delete suggestions"
  on public.founder_suggestions for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create trigger founder_suggestions_updated_at
  before update on public.founder_suggestions
  for each row execute function public.handle_updated_at();

-- Prioritization voting: one vote per founding member per suggestion.
create table if not exists public.founder_suggestion_votes (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid references public.founder_suggestions(id) on delete cascade not null,
  voter_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique (suggestion_id, voter_id)
);

create index if not exists founder_suggestion_votes_suggestion_idx on public.founder_suggestion_votes(suggestion_id);

alter table public.founder_suggestion_votes enable row level security;

create policy "Founding members and admins can view votes"
  on public.founder_suggestion_votes for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (p.is_founding_member or p.role = 'admin')
  ));

create policy "Founding members and admins can vote"
  on public.founder_suggestion_votes for insert
  with check (
    auth.uid() = voter_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.is_founding_member or p.role = 'admin')
    )
  );

create policy "Voters can remove their own vote"
  on public.founder_suggestion_votes for delete
  using (auth.uid() = voter_id);

-- Flat comments (no nested replies — see scope doc) per suggestion.
create table if not exists public.founder_suggestion_comments (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid references public.founder_suggestions(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists founder_suggestion_comments_suggestion_idx on public.founder_suggestion_comments(suggestion_id);

alter table public.founder_suggestion_comments enable row level security;

create policy "Founding members and admins can view comments"
  on public.founder_suggestion_comments for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (p.is_founding_member or p.role = 'admin')
  ));

create policy "Founding members and admins can comment"
  on public.founder_suggestion_comments for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.is_founding_member or p.role = 'admin')
    )
  );

create policy "Authors and admins can delete comments"
  on public.founder_suggestion_comments for delete
  using (
    auth.uid() = author_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
