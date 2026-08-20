-- dm_messages has RLS policies for select and insert (migration 001) but
-- none for update — meaning the "mark as read" call in
-- app/(app)/messages/page.tsx (openConversation) has always been silently
-- rejected by Postgres. The client code never checked the update's error,
-- so this looked like a client bug (and there was a real, separate one —
-- see migration/commit history around openConversation) rather than what
-- it actually was: every "mark this conversation read" call failing at the
-- database level, for every member, since the DM feature shipped.
--
-- Scoped to either participant of the conversation, not just the message's
-- own sender — the whole point is letting the *recipient* flip is_read on
-- a message the *other* person sent.
create policy "Participants can update DM messages"
  on public.dm_messages for update
  using (
    exists (
      select 1 from public.dm_conversations c
      where c.id = dm_messages.conversation_id
      and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );
