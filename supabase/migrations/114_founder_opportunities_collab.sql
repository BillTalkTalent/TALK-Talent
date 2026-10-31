-- Not every founding member has admin access, but they should be able to
-- post, discuss, and comment on volunteer ideas without it — volunteer
-- opportunities were admin-only to create (migration 112); this opens
-- posting and editing-your-own to any founding member, same layered
-- pattern as discussion posts (migration 110): author manages their own,
-- admin manages everything.
alter table public.founder_opportunities
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

drop policy if exists "Admins can manage volunteer opportunities" on public.founder_opportunities;
drop policy if exists "Founding members can view active volunteer opportunities" on public.founder_opportunities;

create policy "Founding members and admins can view opportunities"
  on public.founder_opportunities for select
  using (
    is_active
    or created_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Founding members and admins can post opportunities"
  on public.founder_opportunities for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.is_founding_member or p.role = 'admin')
    )
  );

create policy "Creators and admins can edit opportunities"
  on public.founder_opportunities for update
  using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Creators and admins can delete opportunities"
  on public.founder_opportunities for delete
  using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Flat comments per opportunity (no nested replies — same shape as
-- founder_suggestion_comments, migration 109), so founding members can
-- actually talk about a volunteer idea, not just sign up for it.
create table if not exists public.founder_opportunity_comments (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references public.founder_opportunities(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists founder_opportunity_comments_opportunity_idx on public.founder_opportunity_comments(opportunity_id);

alter table public.founder_opportunity_comments enable row level security;

create policy "Founding members and admins can view opportunity comments"
  on public.founder_opportunity_comments for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (p.is_founding_member or p.role = 'admin')
  ));

create policy "Founding members and admins can comment on opportunities"
  on public.founder_opportunity_comments for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.is_founding_member or p.role = 'admin')
    )
  );

create policy "Authors and admins can delete opportunity comments"
  on public.founder_opportunity_comments for delete
  using (
    auth.uid() = author_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
