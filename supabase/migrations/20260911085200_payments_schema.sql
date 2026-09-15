-- =============================================================================
-- BhuSetu Payments Schema Migration
-- =============================================================================

-- 1. Custom Enum Types
CREATE TYPE payment_status AS ENUM (
  'pending',
  'reconciled',
  'disputed',
  'failed'
);

-- 2. Payments Table
CREATE TABLE payments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  award_id           UUID NOT NULL REFERENCES awards(id) ON DELETE CASCADE,
  paid_amount        DOUBLE PRECISION,
  external_reference TEXT,
  status             payment_status NOT NULL DEFAULT 'pending',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_payments_project_id ON payments(project_id);
CREATE INDEX idx_payments_award_id ON payments(award_id);
CREATE INDEX idx_payments_status ON payments(status);

-- 3. Enable Row Level Security
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Users can view payments"
ON payments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert payments"
ON payments
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update payments"
ON payments
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
