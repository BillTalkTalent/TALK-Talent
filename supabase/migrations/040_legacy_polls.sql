-- Support migrating legacy TALK polls (aggregate results, since the old
-- platform exposes no individual votes) and add poll comments.

-- Provenance + a place to store the historical per-option tallies. Legacy polls
-- have no rows in poll_votes, so the UI reads legacy_vote_count instead.
alter table public.polls        add column if not exists is_legacy boolean not null default false;
alter table public.polls        add column if not exists legacy_id text;
-- Total respondents (denominator for %); multi-choice option counts sum higher.
alter table public.polls        add column if not exists legacy_total_votes integer;
alter table public.poll_options add column if not exists legacy_vote_count integer;

-- Poll comments (new feature; also the destination for migrated legacy comments).
-- user_id is nullable so a legacy comment whose author didn't migrate can still
-- be shown via author_name.
create table if not exists public.poll_comments (
  id uuid default uuid_generate_v4() primary key,
  poll_id uuid references public.polls(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  author_name text,
  content text not null,
  is_legacy boolean not null default false,
  created_at timestamptz default now()
);

alter table public.poll_comments enable row level security;

create policy "Members can view poll comments"
  on public.poll_comments for select using (auth.uid() is not null);

create policy "Members can add poll comments"
  on public.poll_comments for insert with check (auth.uid() = user_id);

create policy "Authors and admins can delete poll comments"
  on public.poll_comments for delete using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create index if not exists poll_comments_poll_id_idx on public.poll_comments(poll_id);
