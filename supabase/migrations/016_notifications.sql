-- Notifications table
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null default 'forum_topic',
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz default now()
);

-- Fast index for unread count queries
create index notifications_user_unread
  on public.notifications(user_id, is_read)
  where is_read = false;

-- RLS
alter table public.notifications enable row level security;

create policy "Users see own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can mark own notifications read"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role (cron, server actions) can insert
create policy "Service role can insert notifications"
  on public.notifications for insert
  with check (true);

-- Function: fan out a notification to all approved members when a forum topic is created
create or replace function public.notify_on_forum_topic()
returns trigger language plpgsql security definer as $$
declare
  cat_slug text;
  cat_name text;
begin
  select slug, name into cat_slug, cat_name
  from public.forum_categories
  where id = NEW.category_id;

  insert into public.notifications (user_id, type, title, body, link)
  select
    p.id,
    'forum_topic',
    NEW.title,
    cat_name,
    '/forum/' || cat_slug || '/' || NEW.id
  from public.profiles p
  where p.status = 'approved'
    and p.id is distinct from NEW.author_id;

  return NEW;
end;
$$;

create trigger on_forum_topic_created
  after insert on public.forum_topics
  for each row execute procedure public.notify_on_forum_topic();
