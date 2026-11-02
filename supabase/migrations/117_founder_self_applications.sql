-- Lets any approved TALK member nominate THEMSELVES into the founding
-- group, not just have an existing founding member nominate them (migration
-- 113). Reuses founder_nominations rather than a parallel table — a
-- self-application is shaped identically (name/email/note/status), the
-- admin review flow (lookup-by-email, grantFoundingMemberAccess) already
-- works unchanged since the applicant is by definition already an
-- approved member, and `is_self` just distinguishes it in the admin list.
alter table public.founder_nominations
  add column if not exists is_self boolean not null default false;

-- Separate, additive policy — the existing "Founding members and admins
-- can nominate" policy (peer referral) is untouched. Any approved member
-- (not just founding members/admins) can insert one of these, but only
-- about themselves.
create policy "Approved members can self-apply for founders"
  on public.founder_nominations for insert
  with check (
    auth.uid() = nominator_id
    and is_self = true
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved')
  );

-- Nominations are otherwise admin-only to see (not even the nominator,
-- per migration 113's comment) — but a self-applicant needs to see their
-- OWN application's status so the apply page can say "already submitted"
-- instead of letting them spam duplicates.
create policy "Self-applicants can view their own application"
  on public.founder_nominations for select
  using (is_self = true and nominator_id = auth.uid());
