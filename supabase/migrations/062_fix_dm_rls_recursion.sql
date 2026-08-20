-- Fixes migration 061: the conversation_participants SELECT/INSERT
-- policies checked membership by querying conversation_participants from
-- within conversation_participants' own policy. Postgres re-applies a
-- table's RLS policy to any subquery against that same table, so this
-- self-reference recurses indefinitely and every query against the table
-- fails with "infinite recursion detected in policy for relation
-- conversation_participants" — including the subqueries dm_conversations'
-- and dm_messages' own policies run against it. That one broken policy is
-- why ALL direct messages disappeared and starting a new one silently
-- failed: every DM-related read/write started erroring, and the client
-- logs (rather than surfaces) those errors, so it just looked like "no
-- conversations."
--
-- Standard fix: do the membership check inside a SECURITY DEFINER
-- function. It runs as the function owner (the migration role, which owns
-- the table and is therefore exempt from its own RLS), so the query
-- inside the function bypasses RLS entirely instead of re-triggering the
-- policy that's calling it.
create or replace function public.is_dm_participant(p_conversation_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id and cp.user_id = p_user_id
  );
$$;

grant execute on function public.is_dm_participant(uuid, uuid) to authenticated;

drop policy if exists "Participants can view conversation membership" on public.conversation_participants;
create policy "Participants can view conversation membership"
  on public.conversation_participants for select
  using (public.is_dm_participant(conversation_id));

drop policy if exists "Creator or existing participant can add members" on public.conversation_participants;
create policy "Creator or existing participant can add members"
  on public.conversation_participants for insert
  with check (
    exists (
      select 1 from public.dm_conversations c
      where c.id = conversation_id and c.created_by = auth.uid()
    )
    or public.is_dm_participant(conversation_id)
  );

-- dm_conversations/dm_messages policies weren't self-referencing (they
-- query a different table), so they weren't the source of the recursion —
-- but route them through the same helper for consistency now that it
-- exists, instead of duplicating the exists(...) subquery three times.
drop policy if exists "Participants can view own DM conversations" on public.dm_conversations;
create policy "Participants can view own DM conversations"
  on public.dm_conversations for select
  using (public.is_dm_participant(id));

drop policy if exists "Participants can view DM messages" on public.dm_messages;
create policy "Participants can view DM messages"
  on public.dm_messages for select
  using (public.is_dm_participant(conversation_id));

drop policy if exists "Participants can send DM messages" on public.dm_messages;
create policy "Participants can send DM messages"
  on public.dm_messages for insert
  with check (auth.uid() = sender_id and public.is_dm_participant(conversation_id));

drop policy if exists "Participants can update DM messages" on public.dm_messages;
create policy "Participants can update DM messages"
  on public.dm_messages for update
  using (public.is_dm_participant(conversation_id));
