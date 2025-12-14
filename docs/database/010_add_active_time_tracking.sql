-- Add active time tracking fields to user_challenges table
-- This allows tracking real active time (excluding pauses)

ALTER TABLE user_challenges
ADD COLUMN IF NOT EXISTS active_time_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_resumed_at TIMESTAMPTZ;

-- Add comment
COMMENT ON COLUMN user_challenges.active_time_seconds IS 'Total active time in seconds (excluding pauses)';
COMMENT ON COLUMN user_challenges.last_resumed_at IS 'When challenge was last resumed (to calculate current session time)';
