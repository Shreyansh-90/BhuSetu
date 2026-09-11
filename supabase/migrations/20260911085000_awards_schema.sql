-- =============================================================================
-- BhuSetu Awards Schema Migration
-- =============================================================================

-- 1. Custom Enum Types
CREATE TYPE award_status AS ENUM (
  'draft',
  'assessed',
  'approved',
  'disbursed'
);

-- 2. Awards Table
CREATE TABLE awards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parcel_id       UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  assessed_amount DOUBLE PRECISION,
  award_date      DATE,
  status          award_status NOT NULL DEFAULT 'draft',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_awards_updated_at
  BEFORE UPDATE ON awards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_awards_project_id ON awards(project_id);
CREATE INDEX idx_awards_parcel_id ON awards(parcel_id);
CREATE INDEX idx_awards_status ON awards(status);

-- 3. Enable Row Level Security
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- For simplicity at this stage (similar to other tables where policies are deferred or simplified):
-- Viewers and above can select, but only authorized roles can update. 
-- Assuming standard access for authenticated users for now, following initial_schema's approach.

CREATE POLICY "Users can view awards"
ON awards
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert awards"
ON awards
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update awards"
ON awards
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
