-- Add company website URL to job posts (used to fetch company logo via Clearbit)
alter table job_posts add column if not exists company_url text null;
