-- ============================================================
-- INVITATIONS & VENDOR SUGGESTIONS
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ── invitations ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invitations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  email       text        NOT NULL,
  name        text,
  message     text,
  status      text        NOT NULL DEFAULT 'sent'
                CHECK (status IN ('sent', 'accepted', 'expired')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Members can see invites they sent
CREATE POLICY "invitations_own_select" ON invitations
  FOR SELECT TO authenticated USING (inviter_id = auth.uid());

-- Members can insert their own invites
CREATE POLICY "invitations_own_insert" ON invitations
  FOR INSERT TO authenticated WITH CHECK (inviter_id = auth.uid());

-- Admins can see all
CREATE POLICY "invitations_admin_select" ON invitations
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_inv_inviter ON invitations (inviter_id);
CREATE INDEX IF NOT EXISTS idx_inv_email   ON invitations (email);

-- ── vendor_suggestions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendor_suggestions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  name        text        NOT NULL,
  website     text,
  category    text,
  description text,
  reason      text,
  status      text        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'reviewed', 'added', 'rejected')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_suggestions ENABLE ROW LEVEL SECURITY;

-- Members can see their own suggestions
CREATE POLICY "vs_own_select" ON vendor_suggestions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Members can submit suggestions
CREATE POLICY "vs_own_insert" ON vendor_suggestions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Admins can see and update all
CREATE POLICY "vs_admin_select" ON vendor_suggestions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "vs_admin_update" ON vendor_suggestions
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_vs_user   ON vendor_suggestions (user_id);
CREATE INDEX IF NOT EXISTS idx_vs_status ON vendor_suggestions (status);
