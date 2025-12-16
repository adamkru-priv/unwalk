-- ============================================
-- MOVEE: Add claimed_at column to user_challenges
-- Migration 034
-- ============================================

-- Add claimed_at column if it doesn't exist
ALTER TABLE user_challenges
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_challenges_claimed_at ON user_challenges(claimed_at) WHERE claimed_at IS NOT NULL;

COMMENT ON COLUMN user_challenges.claimed_at IS 'Timestamp when challenge reward was claimed';
