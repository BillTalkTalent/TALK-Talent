-- Closes a chicken-and-egg gap in 064's dm_conversations SELECT policy
-- (using (is_dm_participant(id))), confirmed live against production:
--
-- The client (and any insert().select() call in general) creates a
-- dm_conversations row, then immediately reads it back to get its id —
-- that's what `.insert({...}).select().single()` does under the hood
-- (Prefer: return=representation). At that exact moment, the creator has
-- NOT yet been added to conversation_participants — that's a separate
-- insert the client does right after — so is_dm_participant(id) is false
-- for them and the read-back is denied by RLS. PostgREST reports the
-- whole insert+select call as failed even though the row was actually
-- created, which is exactly why every "start a new conversation" attempt
-- silently did nothing: getOrCreateConversation/createGroupConversation
-- got back an error, logged it to the console (never shown to the user),
-- and returned null.
--
-- Fix: let a conversation's creator see it via created_by, in addition to
-- is_dm_participant for everyone else. This only matters for the brief
-- window before the creator's own participant row exists — after that,
-- is_dm_participant(id) would be true anyway.

drop policy if exists "Participants can view own DM conversations" on public.dm_conversations;
create policy "Participants can view own DM conversations"
  on public.dm_conversations for select
  using (public.is_dm_participant(id) or created_by = auth.uid());
