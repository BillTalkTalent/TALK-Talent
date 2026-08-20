-- Group DM support (2+ participants per conversation).
--
-- The original schema hard-codes exactly two participants per
-- dm_conversations row (participant_a/participant_b, unique + ordering
-- check). This migration introduces a conversation_participants junction
-- table as the new source of truth for "who is in this conversation" and
-- relaxes the old two-column model so it no longer constrains new rows.
-- Existing 1:1 conversations are backfilled into the new table and keep
-- working unchanged; participant_a/participant_b are left in place
-- (nullable, unconstrained) purely as historical data — new code should
-- not read or write them.

-- 1. Who created a conversation. Needed to break the RLS chicken-and-egg
--    problem below: when a new group conversation is created, the very
--    first INSERT into conversation_participants (adding the creator and
--    everyone else in one batch) can't yet rely on "already a participant"
--    checks, because no participant rows exist yet.
alter table public.dm_conversations
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

update public.dm_conversations
  set created_by = participant_a
  where created_by is null;

-- 2. participant_a/participant_b no longer apply to group conversations —
--    drop their NOT NULL and the old two-person unique/ordering constraints
--    (looked up dynamically since Postgres auto-generates their names).
alter table public.dm_conversations alter column participant_a drop not null;
alter table public.dm_conversations alter column participant_b drop not null;

do $$
declare
  r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.dm_conversations'::regclass
      and contype in ('u', 'c')
      and conname not like '%_pkey'
  loop
    execute format('alter table public.dm_conversations drop constraint %I', r.conname);
  end loop;
end $$;

-- 3. Junction table: one row per (conversation, member).
create table if not exists public.conversation_participants (
  conversation_id uuid references public.dm_conversations(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_participants enable row level security;

-- Backfill from the existing two-column model.
insert into public.conversation_participants (conversation_id, user_id)
select id, participant_a from public.dm_conversations where participant_a is not null
on conflict do nothing;

insert into public.conversation_participants (conversation_id, user_id)
select id, participant_b from public.dm_conversations where participant_b is not null
on conflict do nothing;

-- 4. RLS for conversation_participants.
drop policy if exists "Participants can view conversation membership" on public.conversation_participants;
create policy "Participants can view conversation membership"
  on public.conversation_participants for select
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_participants.conversation_id
      and cp.user_id = auth.uid()
    )
  );

drop policy if exists "Creator or existing participant can add members" on public.conversation_participants;
create policy "Creator or existing participant can add members"
  on public.conversation_participants for insert
  with check (
    exists (
      select 1 from public.dm_conversations c
      where c.id = conversation_id and c.created_by = auth.uid()
    )
    or exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_participants.conversation_id
      and cp.user_id = auth.uid()
    )
  );

-- 5. RLS for dm_conversations — membership now comes from the junction
--    table instead of participant_a/participant_b.
drop policy if exists "Participants can view own DM conversations" on public.dm_conversations;
create policy "Participants can view own DM conversations"
  on public.dm_conversations for select
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = dm_conversations.id and cp.user_id = auth.uid()
    )
  );

drop policy if exists "Approved members can create DM conversations" on public.dm_conversations;
create policy "Approved members can create DM conversations"
  on public.dm_conversations for insert
  with check (
    created_by = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved')
  );

-- 6. RLS for dm_messages — replace the participant_a/participant_b checks
--    (migration 001's select/insert, migration 060's update) with the
--    junction-table equivalent so group conversations work the same way.
drop policy if exists "Participants can view DM messages" on public.dm_messages;
create policy "Participants can view DM messages"
  on public.dm_messages for select
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = dm_messages.conversation_id and cp.user_id = auth.uid()
    )
  );

drop policy if exists "Participants can send DM messages" on public.dm_messages;
create policy "Participants can send DM messages"
  on public.dm_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = dm_messages.conversation_id and cp.user_id = auth.uid()
    )
  );

drop policy if exists "Participants can update DM messages" on public.dm_messages;
create policy "Participants can update DM messages"
  on public.dm_messages for update
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = dm_messages.conversation_id and cp.user_id = auth.uid()
    )
  );

create index if not exists conversation_participants_user_id_idx on public.conversation_participants(user_id);
