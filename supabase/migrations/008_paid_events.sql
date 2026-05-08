-- ============================================================
-- PAID EVENTS MIGRATION
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Add paid-event fields to events table
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_paid  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price    integer,        -- amount in cents (e.g. 4900 = $49.00)
  ADD COLUMN IF NOT EXISTS currency text    NOT NULL DEFAULT 'usd';

-- ── event_registrations ──────────────────────────────────────
-- Tracks paid registrations (separate from free RSVPs)

CREATE TABLE IF NOT EXISTS public.event_registrations (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                  uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id                   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_session_id         text        UNIQUE,
  stripe_payment_intent_id  text,
  amount_paid               integer,
  currency                  text        NOT NULL DEFAULT 'usd',
  status                    text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'completed', 'refunded', 'cancelled')),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION touch_er_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS er_updated_at ON event_registrations;
CREATE TRIGGER er_updated_at
  BEFORE UPDATE ON event_registrations
  FOR EACH ROW EXECUTE FUNCTION touch_er_updated_at();

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- Users can view their own registrations
CREATE POLICY "er_user_select" ON event_registrations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all registrations
CREATE POLICY "er_admin_select" ON event_registrations
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── Indexes ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_er_event          ON event_registrations (event_id);
CREATE INDEX IF NOT EXISTS idx_er_user           ON event_registrations (user_id);
CREATE INDEX IF NOT EXISTS idx_er_stripe_session ON event_registrations (stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_er_status         ON event_registrations (status);
