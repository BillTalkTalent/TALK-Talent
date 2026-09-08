-- Lets an admin convert a vendor_leads application straight into a real
-- vendors row (via /admin/vendors?leadId=...) instead of re-typing everything
-- by hand. converted_vendor_id records which listing a lead became, and
-- 'converted' is a new terminal status alongside the existing ones.

alter table public.vendor_leads
  add column if not exists converted_vendor_id uuid references public.vendors(id) on delete set null;

alter table public.vendor_leads drop constraint if exists vendor_leads_status_check;
alter table public.vendor_leads
  add constraint vendor_leads_status_check
  check (status in ('pending', 'reviewed', 'contacted', 'declined', 'converted'));
