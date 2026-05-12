-- Bump forum_topics.updated_at whenever a reply is inserted or deleted
-- so that the category listing's "sort by updated_at" reflects the most recent activity

create or replace function public.bump_topic_on_reply()
returns trigger language plpgsql security definer as $$
begin
  update public.forum_topics
    set updated_at = now()
  where id = coalesce(NEW.topic_id, OLD.topic_id);
  return coalesce(NEW, OLD);
end;
$$;

create trigger on_forum_reply_inserted
  after insert on public.forum_replies
  for each row execute procedure public.bump_topic_on_reply();

create trigger on_forum_reply_deleted
  after delete on public.forum_replies
  for each row execute procedure public.bump_topic_on_reply();
