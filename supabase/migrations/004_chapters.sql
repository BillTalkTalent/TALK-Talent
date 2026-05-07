create table public.chapters (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  slug text unique not null,
  icon text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table public.chapters enable row level security;
create policy "Anyone authenticated can view chapters"
  on public.chapters for select using (auth.uid() is not null);
create policy "Admins can manage chapters"
  on public.chapters for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create table public.chapter_memberships (
  id uuid default uuid_generate_v4() primary key,
  chapter_id uuid references public.chapters(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamptz default now(),
  unique (chapter_id, user_id)
);

alter table public.chapter_memberships enable row level security;
create policy "Members can view chapter memberships"
  on public.chapter_memberships for select using (auth.uid() is not null);
create policy "Members can join chapters"
  on public.chapter_memberships for insert with check (auth.uid() = user_id);
create policy "Members can leave chapters"
  on public.chapter_memberships for delete using (auth.uid() = user_id);

-- Seed the 9 topical chapters
insert into public.chapters (name, description, slug, icon, sort_order) values
  ('Executive & Leadership Recruiting', 'Strategies for hiring C-suite, VP, and director-level talent', 'executive-leadership', '🏆', 1),
  ('Campus & Early Careers', 'University recruiting, internships, and early talent programs', 'campus-early-careers', '🎓', 2),
  ('Sourcing & Research', 'Advanced sourcing techniques, Boolean, and talent intelligence', 'sourcing-research', '🔍', 3),
  ('DEI in Talent', 'Building diverse pipelines and inclusive hiring practices', 'dei-talent', '🤝', 4),
  ('Tech & AI in TA', 'ATS, AI tools, automation, and the future of recruiting', 'tech-ai', '🤖', 5),
  ('Employer Brand', 'EVP, candidate experience, and employer marketing', 'employer-brand', '✨', 6),
  ('Operations & Analytics', 'Recruiting ops, metrics, reporting, and process improvement', 'operations-analytics', '📊', 7),
  ('High-Volume Recruiting', 'Hourly, frontline, and large-scale hiring strategies', 'high-volume', '⚡', 8),
  ('Startup & Scaleup TA', 'Building TA functions from scratch in fast-growth companies', 'startup-scaleup', '🚀', 9);

-- Add a forum category for each chapter (link via slug matching)
insert into public.forum_categories (name, description, slug, sort_order) values
  ('Executive & Leadership Recruiting', 'Strategies for hiring C-suite, VP, and director-level talent', 'chapter-executive-leadership', 10),
  ('Campus & Early Careers', 'University recruiting, internships, and early talent programs', 'chapter-campus-early-careers', 11),
  ('Sourcing & Research', 'Advanced sourcing techniques, Boolean, and talent intelligence', 'chapter-sourcing-research', 12),
  ('DEI in Talent', 'Building diverse pipelines and inclusive hiring practices', 'chapter-dei-talent', 13),
  ('Tech & AI in TA', 'ATS, AI tools, automation, and the future of recruiting', 'chapter-tech-ai', 14),
  ('Employer Brand', 'EVP, candidate experience, and employer marketing', 'chapter-employer-brand', 15),
  ('Operations & Analytics', 'Recruiting ops, metrics, reporting, and process improvement', 'chapter-operations-analytics', 16),
  ('High-Volume Recruiting', 'Hourly, frontline, and large-scale hiring strategies', 'chapter-high-volume', 17),
  ('Startup & Scaleup TA', 'Building TA functions from scratch in fast-growth companies', 'chapter-startup-scaleup', 18);
