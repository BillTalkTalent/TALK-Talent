alter table public.dm_conversations
  add column if not exists last_message_at timestamptz default now(),
  add column if not exists last_message_preview text;

create or replace function public.update_conversation_last_message()
returns trigger language plpgsql security definer as $$
begin
  update public.dm_conversations set last_message_at=new.created_at, last_message_preview=left(new.content,100) where id=new.conversation_id;
  return new;
end;
$$;
drop trigger if exists on_dm_message_sent on public.dm_messages;
create trigger on_dm_message_sent after insert on public.dm_messages for each row execute function public.update_conversation_last_message();
