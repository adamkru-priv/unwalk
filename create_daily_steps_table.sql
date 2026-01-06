-- ========================================
-- Create daily_steps table
-- ========================================
-- This table stores daily step counts from HealthKit
-- Used by sync_steps() function for background sync
-- ========================================

CREATE TABLE IF NOT EXISTS daily_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT,
  date DATE NOT NULL,
  steps INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per user per day
  UNIQUE(user_id, date)
);

-- Add indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_daily_steps_user_date 
  ON daily_steps(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_steps_date 
  ON daily_steps(date DESC);

-- Enable RLS
ALTER TABLE daily_steps ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own daily steps
CREATE POLICY "Users can view own daily steps"
  ON daily_steps FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own daily steps
CREATE POLICY "Users can insert own daily steps"
  ON daily_steps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own daily steps
CREATE POLICY "Users can update own daily steps"
  ON daily_steps FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Allow sync_steps function to insert/update (SECURITY DEFINER bypasses RLS)
-- No additional policy needed - SECURITY DEFINER handles this

COMMENT ON TABLE daily_steps IS 'Stores daily step counts synced from HealthKit. Used for tracking progress, streaks, and challenges.';
COMMENT ON COLUMN daily_steps.device_id IS 'Device identifier from iOS (optional)';
COMMENT ON COLUMN daily_steps.steps IS 'Total steps for the day';
