-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  title text,                  -- e.g. "Senior Recruiter"
  company text,
  bio text,
  linkedin_url text,
  status text not null default 'pending'  -- pending | approved | rejected
    check (status in ('pending', 'approved', 'rejected')),
  role text not null default 'member'
    check (role in ('member', 'admin')),
  rejection_note text,         -- admin note on rejection
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by approved members"
  on public.profiles for select
  using (
    status = 'approved'
    or auth.uid() = id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can update any profile"
  on public.profiles for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Trigger: keep updated_at fresh
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Trigger: auto-create profile row on auth.users insert
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- VENDORS
-- ============================================================
create table public.vendors (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  website text,
  category text,
  contact_name text,
  contact_email text,
  logo_url text,
  is_featured boolean default false,
  submitted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.vendors enable row level security;

create policy "Vendors viewable by approved members"
  on public.vendors for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved'));

create policy "Admins can manage vendors"
  on public.vendors for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "Approved members can submit vendors"
  on public.vendors for insert
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved'));

create trigger vendors_updated_at
  before update on public.vendors
  for each row execute function public.handle_updated_at();

-- ============================================================
-- EVENTS
-- ============================================================
create table public.events (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  location text,
  is_virtual boolean default false,
  virtual_url text,
  event_date timestamptz not null,
  end_date timestamptz,
  max_attendees integer,
  image_url text,
  organizer_id uuid references public.profiles(id) on delete set null,
  status text not null default 'published'
    check (status in ('draft', 'published', 'cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.events enable row level security;

create policy "Events viewable by approved members"
  on public.events for select
  using (
    status = 'published'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved')
  );

create policy "Admins can manage events"
  on public.events for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create trigger events_updated_at
  before update on public.events
  for each row execute function public.handle_updated_at();

create table public.event_rsvps (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'going'
    check (status in ('going', 'not_going', 'waitlist')),
  created_at timestamptz default now(),
  unique (event_id, user_id)
);

alter table public.event_rsvps enable row level security;

create policy "Members can view RSVPs for events"
  on public.event_rsvps for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved'));

create policy "Members can manage own RSVPs"
  on public.event_rsvps for all
  using (auth.uid() = user_id);

-- ============================================================
-- FORUM
-- ============================================================
create table public.forum_categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  slug text unique not null,
  icon text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table public.forum_categories enable row level security;

create policy "Forum categories viewable by approved members"
  on public.forum_categories for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved'));

create policy "Admins can manage categories"
  on public.forum_categories for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create table public.forum_topics (
  id uuid default uuid_generate_v4() primary key,
  category_id uuid references public.forum_categories(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete set null,
  title text not null,
  body text not null,
  is_pinned boolean default false,
  is_locked boolean default false,
  views integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.forum_topics enable row level security;

create policy "Topics viewable by approved members"
  on public.forum_topics for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved'));

create policy "Approved members can create topics"
  on public.forum_topics for insert
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved'));

create policy "Authors can update own topics"
  on public.forum_topics for update
  using (auth.uid() = author_id);

create policy "Admins can manage topics"
  on public.forum_topics for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create trigger forum_topics_updated_at
  before update on public.forum_topics
  for each row execute function public.handle_updated_at();

create table public.forum_replies (
  id uuid default uuid_generate_v4() primary key,
  topic_id uuid references public.forum_topics(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.forum_replies enable row level security;

create policy "Replies viewable by approved members"
  on public.forum_replies for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved'));

create policy "Approved members can create replies"
  on public.forum_replies for insert
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved'));

create policy "Authors can update own replies"
  on public.forum_replies for update
  using (auth.uid() = author_id);

create policy "Admins can manage replies"
  on public.forum_replies for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create trigger forum_replies_updated_at
  before update on public.forum_replies
  for each row execute function public.handle_updated_at();

-- ============================================================
-- CHAT CHANNELS
-- ============================================================
create table public.chat_channels (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  is_private boolean default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.chat_channels enable row level security;

create policy "Channels viewable by approved members"
  on public.chat_channels for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved'));

create policy "Admins can manage channels"
  on public.chat_channels for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create table public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  channel_id uuid references public.chat_channels(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.chat_messages enable row level security;

create policy "Messages viewable by approved members"
  on public.chat_messages for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved'));

create policy "Approved members can send messages"
  on public.chat_messages for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved')
  );

create policy "Authors can update own messages"
  on public.chat_messages for update
  using (auth.uid() = user_id);

create policy "Authors and admins can delete messages"
  on public.chat_messages for delete
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create trigger chat_messages_updated_at
  before update on public.chat_messages
  for each row execute function public.handle_updated_at();

-- ============================================================
-- DIRECT MESSAGES
-- ============================================================
create table public.dm_conversations (
  id uuid default uuid_generate_v4() primary key,
  participant_a uuid references public.profiles(id) on delete cascade not null,
  participant_b uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  -- canonical ordering: participant_a < participant_b
  unique (participant_a, participant_b),
  check (participant_a < participant_b)
);

alter table public.dm_conversations enable row level security;

create policy "Participants can view own DM conversations"
  on public.dm_conversations for select
  using (auth.uid() = participant_a or auth.uid() = participant_b);

create policy "Approved members can create DM conversations"
  on public.dm_conversations for insert
  with check (
    (auth.uid() = participant_a or auth.uid() = participant_b)
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved')
  );

create table public.dm_messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.dm_conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete set null,
  content text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table public.dm_messages enable row level security;

create policy "Participants can view DM messages"
  on public.dm_messages for select
  using (
    exists (
      select 1 from public.dm_conversations c
      where c.id = conversation_id
      and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );

create policy "Participants can send DM messages"
  on public.dm_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.dm_conversations c
      where c.id = conversation_id
      and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );

-- ============================================================
-- SEED: default chat channels & forum categories
-- ============================================================
insert into public.forum_categories (name, description, slug, sort_order) values
  ('General Discussion', 'Anything talent acquisition related', 'general', 1),
  ('Job Board', 'Share open roles and opportunities', 'jobs', 2),
  ('Best Practices', 'Share what''s working for you', 'best-practices', 3),
  ('Tools & Tech', 'ATS, sourcing tools, AI, and more', 'tools-tech', 4),
  ('Ask the Community', 'Questions for the hive mind', 'ask', 5);

insert into public.chat_channels (name, description) values
  ('general', 'General conversation for everyone'),
  ('announcements', 'Important community news'),
  ('jobs', 'Share and discuss open roles'),
  ('introductions', 'Introduce yourself to the community'),
  ('resources', 'Share articles, tools, and resources');
