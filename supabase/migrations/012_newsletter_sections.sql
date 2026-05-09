-- Add sections_json column to newsletters
alter table newsletters add column if not exists sections_json jsonb;
