-- ============================================
-- MOVEE: Fix All Badge Functions - Complete Fix
-- Migration 041
-- ============================================

-- Step 1: Fix get_user_achievement_stats function
DROP FUNCTION IF EXISTS get_user_achievement_stats(UUID);

CREATE OR REPLACE FUNCTION get_user_achievement_stats(p_user_id UUID)
RETURNS TABLE(
  total_completed INTEGER,
  total_distance_meters INTEGER,
  current_streak_days INTEGER,
  active_days_this_month INTEGER,
  team_challenges_completed INTEGER
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total completed challenges (INCLUDING claimed)
    (SELECT COUNT(*)::INTEGER 
     FROM user_challenges 
     WHERE user_id = p_user_id 
     AND status IN ('completed', 'claimed')) as total_completed,
    
    -- Total distance walked (sum of all completed challenges) - FIXED: goal_steps
    (SELECT COALESCE(SUM(ac.goal_steps), 0)::INTEGER 
     FROM user_challenges uc 
     JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
     WHERE uc.user_id = p_user_id 
     AND uc.status IN ('completed', 'claimed')) as total_distance_meters,
    
    -- Current streak
    (SELECT 0::INTEGER) as current_streak_days,
    
    -- Active days this month
    (SELECT COUNT(DISTINCT DATE(started_at))::INTEGER 
     FROM user_challenges 
     WHERE user_id = p_user_id 
     AND started_at >= date_trunc('month', NOW())
     AND status IN ('active', 'completed', 'claimed')) as active_days_this_month,
    
    -- Team challenges completed
    (SELECT COUNT(*)::INTEGER 
     FROM user_challenges 
     WHERE user_id = p_user_id 
     AND assigned_by IS NOT NULL 
     AND status IN ('completed', 'claimed')) as team_challenges_completed;
END;
$$;

-- Step 2: Recreate check_and_unlock_achievements function
DROP FUNCTION IF EXISTS check_and_unlock_achievements(UUID);

CREATE OR REPLACE FUNCTION check_and_unlock_achievements(p_user_id UUID)
RETURNS INTEGER 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_stats RECORD;
  v_achievement RECORD;
  v_unlocked_count INTEGER := 0;
BEGIN
  -- Get user stats
  SELECT * INTO v_stats FROM get_user_achievement_stats(p_user_id);
  
  -- Check each achievement condition
  FOR v_achievement IN 
    SELECT * FROM achievement_definitions ORDER BY sort_order
  LOOP
    -- Skip if already unlocked
    IF EXISTS (
      SELECT 1 FROM user_badges 
      WHERE user_id = p_user_id 
      AND achievement_id = v_achievement.id
    ) THEN
      CONTINUE;
    END IF;
    
    -- Check condition based on type
    CASE v_achievement.condition_type
      WHEN 'first_challenge' THEN
        IF v_stats.total_completed >= 1 THEN
          INSERT INTO user_badges (user_id, achievement_id) 
          VALUES (p_user_id, v_achievement.id);
          v_unlocked_count := v_unlocked_count + 1;
        END IF;
        
      WHEN 'total_challenges' THEN
        IF v_stats.total_completed >= v_achievement.condition_value THEN
          INSERT INTO user_badges (user_id, achievement_id) 
          VALUES (p_user_id, v_achievement.id);
          v_unlocked_count := v_unlocked_count + 1;
        END IF;
        
      WHEN 'total_distance' THEN
        IF v_stats.total_distance_meters >= v_achievement.condition_value THEN
          INSERT INTO user_badges (user_id, achievement_id) 
          VALUES (p_user_id, v_achievement.id);
          v_unlocked_count := v_unlocked_count + 1;
        END IF;
        
      WHEN 'streak_days' THEN
        IF v_stats.current_streak_days >= v_achievement.condition_value THEN
          INSERT INTO user_badges (user_id, achievement_id) 
          VALUES (p_user_id, v_achievement.id);
          v_unlocked_count := v_unlocked_count + 1;
        END IF;
        
      WHEN 'team_challenge' THEN
        IF v_stats.team_challenges_completed >= v_achievement.condition_value THEN
          INSERT INTO user_badges (user_id, achievement_id) 
          VALUES (p_user_id, v_achievement.id);
          v_unlocked_count := v_unlocked_count + 1;
        END IF;
        
      WHEN 'active_days_month' THEN
        IF v_stats.active_days_this_month >= v_achievement.condition_value THEN
          INSERT INTO user_badges (user_id, achievement_id) 
          VALUES (p_user_id, v_achievement.id);
          v_unlocked_count := v_unlocked_count + 1;
        END IF;
    END CASE;
  END LOOP;
  
  RETURN v_unlocked_count;
END;
$$;

-- Step 3: Update claim_user_challenge to call check_and_unlock_achievements
DROP FUNCTION IF EXISTS claim_user_challenge(UUID, UUID);

CREATE OR REPLACE FUNCTION claim_user_challenge(
  p_challenge_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_challenge RECORD;
  v_admin_challenge RECORD;
  v_points INTEGER;
  v_new_badges INTEGER;
BEGIN
  -- 1. Update challenge to 'claimed' status
  UPDATE user_challenges
  SET 
    status = 'claimed',
    claimed_at = NOW(),
    user_id = COALESCE(user_id, p_user_id)
  WHERE id = p_challenge_id
  RETURNING * INTO v_user_challenge;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;
  
  -- 2. Get challenge details
  SELECT goal_steps, is_custom INTO v_admin_challenge
  FROM admin_challenges
  WHERE id = v_user_challenge.admin_challenge_id;
  
  -- 3. Calculate and add points (only for system challenges)
  IF NOT v_admin_challenge.is_custom THEN
    -- Calculate points based on goal_steps
    IF v_admin_challenge.goal_steps <= 5000 THEN
      v_points := 5;
    ELSIF v_admin_challenge.goal_steps <= 10000 THEN
      v_points := 10;
    ELSIF v_admin_challenge.goal_steps <= 15000 THEN
      v_points := 15;
    ELSIF v_admin_challenge.goal_steps <= 25000 THEN
      v_points := 25;
    ELSE
      v_points := 50;
    END IF;
    
    -- Add points to user profile
    UPDATE public.users
    SET 
      total_points = COALESCE(total_points, 0) + v_points,
      updated_at = NOW()
    WHERE id = p_user_id;
    
    -- 4. Check and unlock achievements (badges)
    v_new_badges := check_and_unlock_achievements(p_user_id);
    
  ELSE
    v_points := 0;
    v_new_badges := 0;
  END IF;
  
  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'points', v_points,
    'new_badges', v_new_badges,
    'challenge_id', p_challenge_id
  );
END;
$$;

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION get_user_achievement_stats(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_and_unlock_achievements(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION claim_user_challenge(UUID, UUID) TO authenticated, anon;

-- Comments
COMMENT ON FUNCTION get_user_achievement_stats IS 'Get user achievement stats - FIXED to use goal_steps';
COMMENT ON FUNCTION check_and_unlock_achievements IS 'Check and unlock user achievements based on stats';
COMMENT ON FUNCTION claim_user_challenge IS 'Claim completed challenge, add points and check achievements';
