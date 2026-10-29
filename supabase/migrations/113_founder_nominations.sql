-- Replaces the "Refer a Member" link on the Founders Hub (which pointed at
-- the general /invite flow — refers someone to join TALK) with its own
-- distinct thing: a founding member nominating someone to join the
-- FOUNDING GROUP specifically. A nomination is visible only to admins —
-- not even the nominator sees a status page afterward — so this mirrors
-- vendor_claim_requests' shape (public/restricted insert, admin-only
-- select/manage) rather than founder_suggestions, which founding members
-- can read back.
create table if not exists public.founder_nominations (
  id uuid primary key default gen_random_uuid(),
  nominator_id uuid references public.profiles(id) on delete set null,
  name text not null,
  email text not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);

create index if not exists founder_nominations_pending_idx on public.founder_nominations(created_at) where status = 'pending';

alter table public.founder_nominations enable row level security;

create policy "Founding members and admins can nominate"
  on public.founder_nominations for insert
  with check (
    auth.uid() = nominator_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.is_founding_member or p.role = 'admin')
    )
  );

create policy "Admins can manage nominations"
  on public.founder_nominations for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
