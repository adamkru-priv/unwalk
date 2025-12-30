-- Create daily_steps_rewards table to track daily step goal achievements
CREATE TABLE IF NOT EXISTS daily_steps_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_date DATE NOT NULL,
  steps_count INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one reward per user per day
  UNIQUE(user_id, reward_date)
);

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_daily_steps_rewards_user_date 
  ON daily_steps_rewards(user_id, reward_date);

-- Enable RLS
ALTER TABLE daily_steps_rewards ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see and manage their own rewards
CREATE POLICY "Users can view own daily rewards"
  ON daily_steps_rewards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily rewards"
  ON daily_steps_rewards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE daily_steps_rewards IS 'Tracks daily step goal achievements and XP rewards (one per user per day)';
