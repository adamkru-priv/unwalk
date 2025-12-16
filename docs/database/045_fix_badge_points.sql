-- ============================================
-- MOVEE: Fix Badge Points - Add to Total Points
-- Migration 045
-- ============================================

-- Fix check_and_unlock_achievements to add badge points to user total_points
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
          -- Insert badge
          INSERT INTO user_badges (user_id, achievement_id) 
          VALUES (p_user_id, v_achievement.id);
          
          -- Add points to user profile
          UPDATE public.users
          SET total_points = COALESCE(total_points, 0) + v_achievement.points
          WHERE id = p_user_id;
          
          v_unlocked_count := v_unlocked_count + 1;
        END IF;
        
      WHEN 'total_challenges' THEN
        IF v_stats.total_completed >= v_achievement.condition_value THEN
          INSERT INTO user_badges (user_id, achievement_id) 
          VALUES (p_user_id, v_achievement.id);
          
          UPDATE public.users
          SET total_points = COALESCE(total_points, 0) + v_achievement.points
          WHERE id = p_user_id;
          
          v_unlocked_count := v_unlocked_count + 1;
        END IF;
        
      WHEN 'total_distance' THEN
        IF v_stats.total_distance_meters >= v_achievement.condition_value THEN
          INSERT INTO user_badges (user_id, achievement_id) 
          VALUES (p_user_id, v_achievement.id);
          
          UPDATE public.users
          SET total_points = COALESCE(total_points, 0) + v_achievement.points
          WHERE id = p_user_id;
          
          v_unlocked_count := v_unlocked_count + 1;
        END IF;
        
      WHEN 'streak_days' THEN
        IF v_stats.current_streak_days >= v_achievement.condition_value THEN
          INSERT INTO user_badges (user_id, achievement_id) 
          VALUES (p_user_id, v_achievement.id);
          
          UPDATE public.users
          SET total_points = COALESCE(total_points, 0) + v_achievement.points
          WHERE id = p_user_id;
          
          v_unlocked_count := v_unlocked_count + 1;
        END IF;
        
      WHEN 'team_challenge' THEN
        IF v_stats.team_challenges_completed >= v_achievement.condition_value THEN
          INSERT INTO user_badges (user_id, achievement_id) 
          VALUES (p_user_id, v_achievement.id);
          
          UPDATE public.users
          SET total_points = COALESCE(total_points, 0) + v_achievement.points
          WHERE id = p_user_id;
          
          v_unlocked_count := v_unlocked_count + 1;
        END IF;
        
      WHEN 'active_days_month' THEN
        IF v_stats.active_days_this_month >= v_achievement.condition_value THEN
          INSERT INTO user_badges (user_id, achievement_id) 
          VALUES (p_user_id, v_achievement.id);
          
          UPDATE public.users
          SET total_points = COALESCE(total_points, 0) + v_achievement.points
          WHERE id = p_user_id;
          
          v_unlocked_count := v_unlocked_count + 1;
        END IF;
    END CASE;
  END LOOP;
  
  RETURN v_unlocked_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_and_unlock_achievements(UUID) TO authenticated, anon;

-- Fix existing users: add badge points to their total_points
-- This is a one-time fix for users who already have unlocked badges
UPDATE public.users u
SET total_points = COALESCE(u.total_points, 0) + COALESCE(badge_points.total, 0)
FROM (
  SELECT 
    ub.user_id,
    SUM(ad.points) as total
  FROM user_badges ub
  JOIN achievement_definitions ad ON ub.achievement_id = ad.id
  GROUP BY ub.user_id
) badge_points
WHERE u.id = badge_points.user_id;

-- Comments
COMMENT ON FUNCTION check_and_unlock_achievements IS 'Check and unlock achievements, adding badge points to user total_points';
