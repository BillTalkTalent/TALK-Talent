-- Lets an admin write an "Email Members" broadcast and pick a future send
-- time instead of only sending immediately. Mirrors the newsletters table's
-- shape (migration 011) — a row per queued send, a cron job that picks up
-- anything due. Unlike newsletters' weekly-only cron, the cron that drains
-- this table (app/api/cron/send-member-emails) runs every 15 minutes, since
-- this is meant to support picking an arbitrary date/time, not just one
-- fixed weekly slot.

create table if not exists public.scheduled_emails (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  body_html text not null,
  -- Same audience filters as the immediate-send path (app/admin/email) —
  -- null chapter_id = all chapters, null audience_role = all members.
  chapter_id uuid references public.chapters(id) on delete set null,
  audience_role text,
  status text not null default 'scheduled' check (status in ('scheduled', 'sent', 'canceled', 'failed')),
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  recipient_count int,
  skipped_count int,
  error text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scheduled_emails_due_idx
  on public.scheduled_emails (scheduled_for)
  where status = 'scheduled';

alter table public.scheduled_emails enable row level security;

create policy "Admins can do everything on scheduled_emails"
  on public.scheduled_emails for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create or replace function public.update_scheduled_emails_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists scheduled_emails_updated_at on public.scheduled_emails;
create trigger scheduled_emails_updated_at
  before update on public.scheduled_emails
  for each row execute function public.update_scheduled_emails_updated_at();
