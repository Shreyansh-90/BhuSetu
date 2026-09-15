-- =============================================================================
-- BhuSetu Notifications Schema Migration
-- =============================================================================

-- 1. Custom Enum Types
CREATE TYPE notification_category AS ENUM (
  'workflow',
  'milestone',
  'general',
  'alert'
);

-- 2. Notifications Table
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  category        notification_category NOT NULL DEFAULT 'general',
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  is_read         BOOLEAN NOT NULL DEFAULT false,
  reference_id    UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- 3. Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Users can view their own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (user_id IN (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update their own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (user_id IN (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()))
WITH CHECK (user_id IN (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()));
