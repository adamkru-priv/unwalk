-- ========================================
-- Add sync settings to users table
-- ========================================
-- Adds auto-sync toggle and interval settings for each user
-- Default: ON, 15 minutes interval
-- ========================================

-- Add columns for sync settings
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN DEFAULT true;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS sync_interval_minutes INTEGER DEFAULT 15 
  CHECK (sync_interval_minutes IN (1, 5, 15, 30, 60));

-- Add index for faster lookups when checking sync settings
CREATE INDEX IF NOT EXISTS idx_users_sync_settings 
  ON users(id, auto_sync_enabled, sync_interval_minutes) 
  WHERE auto_sync_enabled = true;

-- Drop policy if exists and recreate (PostgreSQL doesn't support IF NOT EXISTS for policies)
DROP POLICY IF EXISTS "Users can update own sync settings" ON users;

CREATE POLICY "Users can update own sync settings"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Comments
COMMENT ON COLUMN users.auto_sync_enabled IS 'Toggle for automatic background step synchronization (ON/OFF)';
COMMENT ON COLUMN users.sync_interval_minutes IS 'Interval in minutes for background sync: 1, 5, 15, 30, or 60';

-- Update existing users to have default settings (if columns were just added)
UPDATE users 
SET 
  auto_sync_enabled = true,
  sync_interval_minutes = 15
WHERE 
  auto_sync_enabled IS NULL 
  OR sync_interval_minutes IS NULL;
