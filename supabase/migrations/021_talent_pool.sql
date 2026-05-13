-- Talent pool: members who are open to new opportunities
create table public.talent_pool (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references public.profiles(id) on delete cascade not null unique,
  headline     text not null default '',   -- short personal pitch
  seeking      text not null default '',   -- roles / types of work they want
  work_pref    text not null default 'flexible'
               check (work_pref in ('remote', 'hybrid', 'onsite', 'flexible')),
  available_from date,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table public.talent_pool enable row level security;

-- Any approved member can browse the pool
create policy "Approved members can view talent pool"
  on public.talent_pool for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'approved'
  ));

-- Members can manage their own entry only
create policy "Members manage own talent pool entry"
  on public.talent_pool for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keep updated_at fresh
create trigger talent_pool_updated_at
  before update on public.talent_pool
  for each row execute procedure public.handle_updated_at();
