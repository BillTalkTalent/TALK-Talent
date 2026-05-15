alter table public.profiles
  add column if not exists ta_level text check (ta_level in ('coordinator','generalist','practitioner','manager','senior_leadership')),
  add column if not exists company_size text check (company_size in ('self_employed','1_10','11_50','51_200','201_500','501_1000','1001_5000','5001_10000','10001_plus')),
  add column if not exists industry text;
