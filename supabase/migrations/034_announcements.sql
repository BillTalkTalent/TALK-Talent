-- Dashboard announcements: admin-posted banners shown to members on the dashboard.
-- Members can dismiss each one (per-user), so it disappears for them but stays
-- visible for everyone who hasn't seen it yet.

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  variant text not null default 'info',        -- info | success | warning
  cta_label text,                              -- optional button text
  cta_href text,                               -- optional button link
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz                       -- optional auto-hide time
);

create table if not exists public.announcement_dismissals (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

alter table public.announcements enable row level security;
alter table public.announcement_dismissals enable row level security;

-- Anyone signed in can read announcements (the dashboard filters active/unexpired).
create policy "Members can read announcements"
  on public.announcements for select
  using (auth.uid() is not null);

-- Only admins / board members can create, edit, or remove announcements.
create policy "Moderators can insert announcements"
  on public.announcements for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'board_member')
    )
  );

create policy "Moderators can update announcements"
  on public.announcements for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'board_member')
    )
  );

create policy "Moderators can delete announcements"
  on public.announcements for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'board_member')
    )
  );

-- Each member manages only their own dismissals.
create policy "Members can read own dismissals"
  on public.announcement_dismissals for select
  using (user_id = auth.uid());

create policy "Members can insert own dismissals"
  on public.announcement_dismissals for insert
  with check (user_id = auth.uid());
