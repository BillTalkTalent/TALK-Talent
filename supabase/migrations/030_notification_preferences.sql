create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_forum_topics boolean default true, email_forum_replies boolean default true,
  email_events boolean default true, email_digest boolean default false,
  email_chapter_announcements boolean default true,
  push_forum_topics boolean default true, push_forum_replies boolean default true, push_events boolean default true,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table public.notification_preferences enable row level security;
create policy "Users manage own notification prefs" on public.notification_preferences for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create trigger notification_preferences_updated_at before update on public.notification_preferences for each row execute function public.handle_updated_at();
