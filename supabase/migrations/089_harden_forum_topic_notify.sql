-- notify_on_forum_topic() (migration 016) fans a notification out to every
-- approved member (12,700+ rows today) synchronously, inside the same
-- transaction as the forum_topics insert itself. If that fan-out insert
-- ever throws for any reason — a transient error, a future constraint, a
-- lock timeout under load — the whole topic creation rolls back and the
-- poster just sees a generic "Failed to create topic," with nothing in the
-- UI to say why. That's a real reliability gap for every category, not
-- something specific to any one of them. Wrap the fan-out in its own
-- exception handler so a notification failure can never take the topic
-- itself down with it.

create or replace function public.notify_on_forum_topic()
returns trigger language plpgsql security definer as $$
declare
  cat_slug text;
  cat_name text;
begin
  select slug, name into cat_slug, cat_name
  from public.forum_categories
  where id = NEW.category_id;

  begin
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
  exception when others then
    raise warning 'notify_on_forum_topic: notification fan-out failed for topic %: %', NEW.id, sqlerrm;
  end;

  return NEW;
end;
$$;
