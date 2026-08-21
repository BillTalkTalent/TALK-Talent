-- Fixes a still-live regression from before migration 061: dm_conversations'
-- SELECT and INSERT policies were supposed to be replaced by 061 (and again,
-- redundantly, by 062) to check membership via created_by/conversation_participants
-- instead of the old participant_a/participant_b columns. Live testing against
-- production (as a real approved member, via a minted session) shows the OLD
-- policies are still the ones actually in effect — the drop+create statements
-- in 061/062 never took hold for this specific table, for reasons that aren't
-- visible from the migration files themselves (most likely they were pasted
-- into the SQL editor in a chunk that partially failed).
--
-- The practical effect: participant_a/participant_b are only ever populated
-- for old, pre-group-DM conversations (backfilled once by 061). Every
-- conversation created since then only sets created_by, so under the old
-- policy a member can't even SELECT the conversation they just created —
-- which cascades into "add participants," "open it," and "send a message"
-- all silently failing, since each of those steps needs to look the
-- conversation up first. Existing 1:1 conversations still work because they
-- still have participant_a/participant_b set, which is exactly why this
-- looked fixed earlier (old conversations kept working) but breaks on
-- anything new — matching the reported "entering in 1 or two names won't
-- start a direct message."
--
-- This migration is a plain re-assertion of what 061/062 already intended,
-- written to be safe to run regardless of the table's current state.

drop policy if exists "Participants can view own DM conversations" on public.dm_conversations;
create policy "Participants can view own DM conversations"
  on public.dm_conversations for select
  using (public.is_dm_participant(id));

drop policy if exists "Approved members can create DM conversations" on public.dm_conversations;
create policy "Approved members can create DM conversations"
  on public.dm_conversations for insert
  with check (
    created_by = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved')
  );
