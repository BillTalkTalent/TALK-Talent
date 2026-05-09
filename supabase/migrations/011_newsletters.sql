-- Newsletters table
create table if not exists newsletters (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  preview_text text,
  body_html text not null default '',
  status text not null default 'draft', -- draft | scheduled | sent
  scheduled_for timestamptz,
  sent_at timestamptz,
  recipient_count int,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table newsletters enable row level security;

create policy "Admins can do everything on newsletters"
  on newsletters for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Updated at trigger
create or replace function update_newsletters_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger newsletters_updated_at
  before update on newsletters
  for each row execute function update_newsletters_updated_at();
