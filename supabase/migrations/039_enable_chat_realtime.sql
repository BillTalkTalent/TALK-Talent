-- Enable Supabase Realtime for chat so messages appear live without a reload.
-- The chat page subscribes to postgres_changes on chat_messages, but the table
-- was never added to the supabase_realtime publication, so no INSERT events
-- were ever delivered. This adds it (idempotently).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;

-- Full replica identity so UPDATE/DELETE realtime events carry the row's data
-- (edits/deletes stream correctly, not just inserts).
alter table public.chat_messages replica identity full;
