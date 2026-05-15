create table if not exists public.vendor_reviews (
  id uuid default uuid_generate_v4() primary key,
  vendor_id uuid references public.vendors(id) on delete cascade not null,
  reviewer_id uuid references public.profiles(id) on delete set null,
  overall_rating integer not null check (overall_rating between 1 and 5),
  ease_of_use_rating integer check (ease_of_use_rating between 1 and 5),
  support_rating integer check (support_rating between 1 and 5),
  value_rating integer check (value_rating between 1 and 5),
  pros text, cons text, summary text not null,
  tenure_months integer, selected_it boolean,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  unique (vendor_id, reviewer_id)
);
alter table public.vendor_reviews enable row level security;
create policy "Approved members can view vendor reviews" on public.vendor_reviews for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved'));
create policy "Approved members can write vendor reviews" on public.vendor_reviews for insert
  with check (auth.uid() = reviewer_id and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved'));
create policy "Reviewers can update own vendor review" on public.vendor_reviews for update using (auth.uid() = reviewer_id);
create policy "Reviewers can delete own vendor review" on public.vendor_reviews for delete using (auth.uid() = reviewer_id);
create trigger vendor_reviews_updated_at before update on public.vendor_reviews for each row execute function public.handle_updated_at();
create index if not exists vendor_reviews_vendor_id_idx on public.vendor_reviews(vendor_id);
