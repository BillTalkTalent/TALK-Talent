-- Same bug migration 039 fixed for chat_messages, just missed for DMs:
-- app/(app)/messages/page.tsx subscribes to postgres_changes INSERT events
-- on dm_messages to show a new message the moment it's sent, but the table
-- was never added to the supabase_realtime publication — so no events were
-- ever delivered, and a sent message only appeared after a manual page
-- reload (which re-fetches via a normal query instead of relying on the
-- realtime stream).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'dm_messages'
  ) then
    alter publication supabase_realtime add table public.dm_messages;
  end if;
end $$;

-- Full replica identity so UPDATE events (e.g. is_read flips) carry the
-- row's data too, not just INSERTs.
alter table public.dm_messages replica identity full;
