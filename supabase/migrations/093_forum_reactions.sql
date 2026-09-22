-- One-click reactions on forum topics and replies. Forum engagement is
-- heavily skewed toward reading, not writing — 27 people out of ~12,800
-- approved members have ever posted a reply, while a poll on the same
-- platform pulls 17,000+ votes. Reactions give people a way to engage in
-- one click instead of needing to write something, the same low-friction
-- shape that makes polls work.
--
-- One reaction per person per target (not one per emoji) — picking a
-- different reaction replaces the previous one rather than stacking, kept
-- simple on purpose. RLS mirrors forum_topics/forum_replies (001_initial_schema.sql):
-- approved members can read all reactions and manage only their own; admins
-- can manage any.
create table public.forum_reactions (
  id uuid default uuid_generate_v4() primary key,
  target_type text not null check (target_type in ('topic', 'reply')),
  target_id uuid not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  emoji text not null check (emoji in ('👍', '🔥', '💡')),
  created_at timestamptz default now(),
  unique (target_type, target_id, user_id)
);

create index forum_reactions_target on public.forum_reactions(target_type, target_id);

alter table public.forum_reactions enable row level security;

create policy "Reactions viewable by approved members"
  on public.forum_reactions for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved'));

create policy "Approved members can react"
  on public.forum_reactions for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved')
  );

create policy "Members can change or remove own reaction"
  on public.forum_reactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Members can remove own reaction"
  on public.forum_reactions for delete
  using (auth.uid() = user_id);

create policy "Admins can manage reactions"
  on public.forum_reactions for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
