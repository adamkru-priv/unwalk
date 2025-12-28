-- ============================================
-- BASE DAILY XP SYSTEM
-- Users earn 1 XP per 1000 steps automatically
-- ============================================

-- 1. Add daily steps tracking columns to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS today_steps INTEGER DEFAULT 0 CHECK (today_steps >= 0),
ADD COLUMN IF NOT EXISTS today_base_xp INTEGER DEFAULT 0 CHECK (today_base_xp >= 0),
ADD COLUMN IF NOT EXISTS last_steps_sync_date DATE,
ADD COLUMN IF NOT EXISTS total_lifetime_steps BIGINT DEFAULT 0 CHECK (total_lifetime_steps >= 0);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_today_steps ON public.users(today_steps DESC);
CREATE INDEX IF NOT EXISTS idx_users_last_sync_date ON public.users(last_steps_sync_date);

-- 2. Function to sync daily steps and award Base XP
CREATE OR REPLACE FUNCTION sync_daily_steps(
  p_user_id UUID,
  p_steps_count INTEGER
)
RETURNS TABLE(
  new_today_steps INTEGER,
  base_xp_earned INTEGER,
  total_xp INTEGER,
  new_level INTEGER,
  leveled_up BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_date DATE := CURRENT_DATE;
  v_last_sync_date DATE;
  v_old_steps INTEGER;
  v_new_steps INTEGER;
  v_base_xp_before INTEGER;
  v_base_xp_after INTEGER;
  v_base_xp_earned INTEGER;
  v_result RECORD;
BEGIN
  -- Get current sync data
  SELECT last_steps_sync_date, today_steps, today_base_xp
  INTO v_last_sync_date, v_old_steps, v_base_xp_before
  FROM public.users
  WHERE id = p_user_id;
  
  -- Check if it's a new day (reset daily counters)
  IF v_last_sync_date IS NULL OR v_last_sync_date < v_current_date THEN
    -- New day - reset daily counters
    v_old_steps := 0;
    v_base_xp_before := 0;
  END IF;
  
  -- Calculate new steps for today
  v_new_steps := GREATEST(p_steps_count, v_old_steps);
  
  -- Calculate Base XP (1 XP per 1000 steps)
  v_base_xp_after := FLOOR(v_new_steps / 1000.0);
  v_base_xp_earned := v_base_xp_after - v_base_xp_before;
  
  -- Update user's daily stats
  UPDATE public.users
  SET 
    today_steps = v_new_steps,
    today_base_xp = v_base_xp_after,
    last_steps_sync_date = v_current_date,
    total_lifetime_steps = total_lifetime_steps + GREATEST(0, v_new_steps - v_old_steps),
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Award XP if earned any new Base XP
  IF v_base_xp_earned > 0 THEN
    SELECT * INTO v_result
    FROM add_xp_to_user(
      p_user_id,
      v_base_xp_earned,
      'daily_steps',
      NULL,
      format('Base XP: %s steps = %s XP', v_new_steps, v_base_xp_after)
    );
    
    -- Update streak
    PERFORM update_user_streak(p_user_id);
    
    RETURN QUERY 
    SELECT 
      v_new_steps,
      v_base_xp_earned,
      v_result.new_xp,
      v_result.new_level,
      v_result.leveled_up;
  ELSE
    -- No new XP earned, just return current stats
    RETURN QUERY
    SELECT 
      v_new_steps,
      0 as base_xp_earned,
      (SELECT xp FROM public.users WHERE id = p_user_id),
      (SELECT level FROM public.users WHERE id = p_user_id),
      FALSE as leveled_up;
  END IF;
END;
$$;

-- 3. Add 'daily_steps' to XP source types
ALTER TABLE public.xp_transactions 
DROP CONSTRAINT IF EXISTS xp_transactions_source_type_check;

ALTER TABLE public.xp_transactions
ADD CONSTRAINT xp_transactions_source_type_check 
CHECK (source_type IN (
  'challenge', 
  'daily_quest', 
  'streak_bonus', 
  'badge', 
  'milestone', 
  'manual',
  'daily_steps'  -- ✨ NEW: Base daily XP source
));

-- 4. Create view for user daily stats (useful for leaderboards)
CREATE OR REPLACE VIEW user_daily_stats AS
SELECT 
  u.id as user_id,
  u.display_name,
  u.avatar_url,
  u.today_steps,
  u.today_base_xp,
  u.last_steps_sync_date,
  u.current_streak,
  u.xp as total_xp,
  u.level,
  dq.completed as daily_quest_completed,
  dq.xp_reward as daily_quest_xp,
  COUNT(DISTINCT uc.id) FILTER (WHERE uc.status = 'active' AND ac.is_team_challenge = true) as active_team_challenges
FROM public.users u
LEFT JOIN public.daily_quests dq ON dq.user_id = u.id AND dq.quest_date = CURRENT_DATE
LEFT JOIN public.user_challenges uc ON uc.user_id = u.id
LEFT JOIN public.admin_challenges ac ON ac.id = uc.admin_challenge_id
GROUP BY u.id, u.display_name, u.avatar_url, u.today_steps, u.today_base_xp, 
         u.last_steps_sync_date, u.current_streak, u.xp, u.level, 
         dq.completed, dq.xp_reward;

-- 5. Comments
COMMENT ON COLUMN public.users.today_steps IS 'Steps walked today (resets at midnight)';
COMMENT ON COLUMN public.users.today_base_xp IS 'Base XP earned from steps today (1 XP per 1000 steps)';
COMMENT ON COLUMN public.users.last_steps_sync_date IS 'Last date when steps were synced';
COMMENT ON COLUMN public.users.total_lifetime_steps IS 'Total steps walked across all time';

COMMENT ON FUNCTION sync_daily_steps IS 'Syncs daily steps from health data and awards Base XP automatically';

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION sync_daily_steps TO authenticated;
GRANT SELECT ON user_daily_stats TO authenticated;

-- ============================================
-- TESTING QUERIES
-- ============================================

-- Test: Sync 5000 steps for a user
-- SELECT * FROM sync_daily_steps('your-user-id', 5000);
-- Expected: 5 Base XP (5000 / 1000)

-- Test: View user daily stats
-- SELECT * FROM user_daily_stats WHERE user_id = 'your-user-id';

-- Test: View XP breakdown
-- SELECT 
--   source_type,
--   SUM(xp_amount) as total_xp,
--   COUNT(*) as transactions
-- FROM xp_transactions
-- WHERE user_id = 'your-user-id'
-- GROUP BY source_type
-- ORDER BY total_xp DESC;
