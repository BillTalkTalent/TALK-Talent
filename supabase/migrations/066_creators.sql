-- Creators section: invited TA leaders/practitioners with a public profile
-- and a feed of resources (videos, decks, links) they post themselves.
--
-- This is a soft launch — RLS reflects the intended final state (approved
-- members can browse approved creators), but the actual restriction to
-- "only Bill can see this for now" is enforced at the page level (redirect
-- if !profile.is_superadmin), not here. That way opening it up later is a
-- one-line change, not a migration.

create table public.creator_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  display_name text not null,
  tagline text,
  bio text,
  avatar_url text,
  website_url text,
  linkedin_url text,
  youtube_url text,
  topics text[] default '{}',
  is_featured boolean default false,
  is_approved boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.creator_profiles enable row level security;

create policy "Approved creator profiles viewable by approved members"
  on public.creator_profiles for select
  using (
    is_approved = true
    or user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Approved members can create their own creator profile"
  on public.creator_profiles for insert
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved')
  );

create policy "Creators can update their own profile"
  on public.creator_profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Admins can manage all creator profiles"
  on public.creator_profiles for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create table public.creator_materials (
  id uuid default gen_random_uuid() primary key,
  creator_id uuid references public.creator_profiles(id) on delete cascade not null,
  title text not null,
  description text,
  type text not null check (type in ('video', 'deck', 'link')),
  url text not null,
  is_published boolean default false,
  published_at timestamptz,
  created_at timestamptz default now()
);

alter table public.creator_materials enable row level security;

create policy "Published materials viewable by approved members"
  on public.creator_materials for select
  using (
    (
      is_published = true
      and exists (select 1 from public.creator_profiles cp where cp.id = creator_id and cp.is_approved = true)
    )
    or exists (select 1 from public.creator_profiles cp where cp.id = creator_id and cp.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Creators manage their own materials"
  on public.creator_materials for insert
  with check (exists (select 1 from public.creator_profiles cp where cp.id = creator_id and cp.user_id = auth.uid()));

create policy "Creators update their own materials"
  on public.creator_materials for update
  using (exists (select 1 from public.creator_profiles cp where cp.id = creator_id and cp.user_id = auth.uid()));

create policy "Creators delete their own materials"
  on public.creator_materials for delete
  using (exists (select 1 from public.creator_profiles cp where cp.id = creator_id and cp.user_id = auth.uid()));

create policy "Admins manage all creator materials"
  on public.creator_materials for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create index creator_materials_creator_id_idx on public.creator_materials(creator_id);
create index creator_profiles_user_id_idx on public.creator_profiles(user_id);
