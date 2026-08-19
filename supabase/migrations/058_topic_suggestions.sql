-- Lets a member suggest a topic/subject they'd like TALK to cover (in a
-- session, discussion, newsletter, etc.) — linked from the weekly event
-- digest's new "Have a topic?" CTA. Mirrors vendor_suggestions'
-- shape/RLS (migration 010) since it's the same "member submits, admin
-- triages" pattern.

create table if not exists public.topic_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  topic text not null,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'planned', 'declined')),
  created_at timestamptz not null default now()
);

alter table public.topic_suggestions enable row level security;

create policy "topic_suggestions_own_select" on public.topic_suggestions
  for select to authenticated using (user_id = auth.uid());

create policy "topic_suggestions_own_insert" on public.topic_suggestions
  for insert to authenticated with check (user_id = auth.uid());

create policy "topic_suggestions_admin_select" on public.topic_suggestions
  for select to authenticated using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "topic_suggestions_admin_update" on public.topic_suggestions
  for update to authenticated using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create index if not exists idx_topic_suggestions_user on public.topic_suggestions (user_id);
