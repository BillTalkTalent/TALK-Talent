-- Forum moderation: allow admins and board members to delete ANY topic or reply.
-- RLS policies are permissive (OR'd), so these add moderator power on top of the
-- existing "authors can delete their own" policies — regular members are unaffected.

create policy "Moderators can delete any topic"
  on public.forum_topics for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'board_member')
    )
  );

create policy "Moderators can delete any reply"
  on public.forum_replies for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'board_member')
    )
  );
