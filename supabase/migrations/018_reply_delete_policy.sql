-- Allow forum reply authors to delete their own replies
create policy "Authors can delete own replies"
  on public.forum_replies for delete
  using (auth.uid() = author_id);

-- Allow forum topic authors to delete their own topics
-- (replies cascade on topic delete via FK)
create policy "Authors can delete own topics"
  on public.forum_topics for delete
  using (auth.uid() = author_id);
