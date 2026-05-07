create table public.polls (
  id uuid default uuid_generate_v4() primary key,
  question text not null,
  created_by uuid references public.profiles(id) on delete set null,
  closes_at timestamptz,
  is_multiple_choice boolean default false,
  status text not null default 'active' check (status in ('active', 'closed')),
  created_at timestamptz default now()
);

alter table public.polls enable row level security;

create policy "Approved members can view polls"
  on public.polls for select using (auth.uid() is not null);

create policy "Approved members can create polls"
  on public.polls for insert with check (auth.uid() is not null);

create policy "Creators and admins can update polls"
  on public.polls for update
  using (auth.uid() = created_by or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create table public.poll_options (
  id uuid default uuid_generate_v4() primary key,
  poll_id uuid references public.polls(id) on delete cascade not null,
  text text not null,
  sort_order integer default 0
);

alter table public.poll_options enable row level security;
create policy "Anyone authenticated can view options" on public.poll_options for select using (auth.uid() is not null);
create policy "Poll creators can insert options" on public.poll_options for insert with check (auth.uid() is not null);

create table public.poll_votes (
  id uuid default uuid_generate_v4() primary key,
  poll_id uuid references public.polls(id) on delete cascade not null,
  option_id uuid references public.poll_options(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique (poll_id, option_id, user_id)
);

alter table public.poll_votes enable row level security;
create policy "Members can view votes" on public.poll_votes for select using (auth.uid() is not null);
create policy "Members can vote" on public.poll_votes for insert with check (auth.uid() = user_id);
create policy "Members can change vote" on public.poll_votes for delete using (auth.uid() = user_id);
