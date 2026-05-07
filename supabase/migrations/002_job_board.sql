create table public.job_posts (
  id uuid default uuid_generate_v4() primary key,
  poster_id uuid references public.profiles(id) on delete set null,
  title text not null,
  company text not null,
  location text,
  is_remote boolean default false,
  job_type text not null default 'full-time'
    check (job_type in ('full-time', 'part-time', 'contract', 'fractional', 'interim')),
  seniority text,
  description text not null,
  apply_url text,
  apply_email text,
  salary_min integer,
  salary_max integer,
  salary_currency text default 'USD',
  is_featured boolean default false,
  status text not null default 'active'
    check (status in ('active', 'closed', 'draft')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.job_posts enable row level security;

create policy "Approved members can view active jobs"
  on public.job_posts for select
  using (status = 'active' and auth.uid() is not null);

create policy "Approved members can post jobs"
  on public.job_posts for insert
  with check (auth.uid() is not null);

create policy "Posters can update own jobs"
  on public.job_posts for update
  using (auth.uid() = poster_id);

create policy "Admins can manage all jobs"
  on public.job_posts for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create trigger job_posts_updated_at
  before update on public.job_posts
  for each row execute function public.handle_updated_at();
