-- ============================================================
-- MENTORSHIP FEATURE MIGRATION
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ── mentorship_areas ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mentorship_areas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  description text,
  icon        text,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO mentorship_areas (name, slug, description, icon, sort_order) VALUES
  ('AI & Automation',                    'ai-automation',          'Leveraging AI tools, automation, and emerging tech in recruiting workflows.',    '🤖', 1),
  ('Building & Scaling TA Functions',    'building-scaling-ta',    'Structuring, growing, and operationalizing talent acquisition teams.',           '🏗️', 2),
  ('Data, Metrics & Reporting',          'data-metrics-reporting', 'Using analytics, dashboards, and KPIs to drive TA strategy and tell the story.', '📊', 3),
  ('DEI & Inclusive Hiring',             'dei-inclusive-hiring',   'Designing equitable processes, sourcing diverse talent, reducing bias.',          '🌍', 4),
  ('Career Growth & Executive Presence', 'career-growth',          'Advancing your TA career, building your brand, navigating to the C-suite.',      '🚀', 5)
ON CONFLICT (slug) DO NOTHING;

-- ── mentorship_profiles ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS mentorship_profiles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  is_mentor  boolean NOT NULL DEFAULT false,
  is_mentee  boolean NOT NULL DEFAULT false,
  bio        text,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── mentorship_area_selections ───────────────────────────────

CREATE TABLE IF NOT EXISTS mentorship_area_selections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  area_id     uuid NOT NULL REFERENCES mentorship_areas(id) ON DELETE CASCADE,
  as_mentor   boolean NOT NULL DEFAULT false,
  as_mentee   boolean NOT NULL DEFAULT false,
  UNIQUE (user_id, area_id)
);

-- ── mentorship_requests ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS mentorship_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mentor_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  area_id      uuid NOT NULL REFERENCES mentorship_areas(id),
  message      text NOT NULL,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn')),
  responded_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_duplicate_pending UNIQUE (requester_id, mentor_id, area_id)
);

-- ── mentorship_connections ───────────────────────────────────

CREATE TABLE IF NOT EXISTS mentorship_connections (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id   uuid NOT NULL UNIQUE REFERENCES mentorship_requests(id) ON DELETE CASCADE,
  mentor_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mentee_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  area_id      uuid NOT NULL REFERENCES mentorship_areas(id),
  is_active    boolean NOT NULL DEFAULT true,
  connected_at timestamptz NOT NULL DEFAULT now()
);

-- ── Trigger: auto-create connection on accept ────────────────

CREATE OR REPLACE FUNCTION handle_mentorship_request_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    INSERT INTO mentorship_connections (request_id, mentor_id, mentee_id, area_id)
    VALUES (NEW.id, NEW.mentor_id, NEW.requester_id, NEW.area_id)
    ON CONFLICT (request_id) DO NOTHING;
    NEW.responded_at := now();
  END IF;
  IF NEW.status IN ('declined', 'withdrawn') AND OLD.status = 'pending' THEN
    NEW.responded_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_mentorship_request_update ON mentorship_requests;
CREATE TRIGGER on_mentorship_request_update
  BEFORE UPDATE ON mentorship_requests
  FOR EACH ROW EXECUTE FUNCTION handle_mentorship_request_update();

-- updated_at trigger for mentorship_profiles
CREATE OR REPLACE FUNCTION touch_mentorship_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS mentorship_profiles_updated_at ON mentorship_profiles;
CREATE TRIGGER mentorship_profiles_updated_at
  BEFORE UPDATE ON mentorship_profiles
  FOR EACH ROW EXECUTE FUNCTION touch_mentorship_updated_at();

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE mentorship_areas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_area_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_requests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_connections     ENABLE ROW LEVEL SECURITY;

-- Areas: public read
CREATE POLICY "areas_read" ON mentorship_areas FOR SELECT TO authenticated USING (true);

-- Profiles: read active ones, write own
CREATE POLICY "mp_read"   ON mentorship_profiles FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "mp_insert" ON mentorship_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "mp_update" ON mentorship_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Area selections: read all, write own
CREATE POLICY "mas_read"   ON mentorship_area_selections FOR SELECT TO authenticated USING (true);
CREATE POLICY "mas_insert" ON mentorship_area_selections FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "mas_update" ON mentorship_area_selections FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "mas_delete" ON mentorship_area_selections FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Requests: parties only
CREATE POLICY "mr_read"   ON mentorship_requests FOR SELECT TO authenticated USING (requester_id = auth.uid() OR mentor_id = auth.uid());
CREATE POLICY "mr_insert" ON mentorship_requests FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid() AND requester_id != mentor_id);
CREATE POLICY "mr_update" ON mentorship_requests FOR UPDATE TO authenticated USING (mentor_id = auth.uid() OR requester_id = auth.uid());

-- Connections: parties only
CREATE POLICY "mc_read" ON mentorship_connections FOR SELECT TO authenticated USING (mentor_id = auth.uid() OR mentee_id = auth.uid());

-- ── Indexes ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_mp_user      ON mentorship_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_mas_user     ON mentorship_area_selections (user_id);
CREATE INDEX IF NOT EXISTS idx_mas_area     ON mentorship_area_selections (area_id);
CREATE INDEX IF NOT EXISTS idx_mr_requester ON mentorship_requests (requester_id);
CREATE INDEX IF NOT EXISTS idx_mr_mentor    ON mentorship_requests (mentor_id);
CREATE INDEX IF NOT EXISTS idx_mr_status    ON mentorship_requests (status);
CREATE INDEX IF NOT EXISTS idx_mc_mentor    ON mentorship_connections (mentor_id);
CREATE INDEX IF NOT EXISTS idx_mc_mentee    ON mentorship_connections (mentee_id);
