-- ============================================
-- FIX: Badge System - Critical Fixes
-- ============================================

-- 1. Fix get_user_achievement_stats function
CREATE OR REPLACE FUNCTION get_user_achievement_stats(p_user_id UUID)
RETURNS TABLE(
  total_completed INTEGER,
  total_distance_meters INTEGER,
  current_streak_days INTEGER,
  active_days_this_month INTEGER,
  team_challenges_completed INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total completed challenges (including 'claimed' status)
    (SELECT COUNT(*)::INTEGER 
     FROM user_challenges 
     WHERE user_id = p_user_id 
     AND status IN ('completed', 'claimed')) as total_completed,
    
    -- Total distance walked - FIX: use goal_steps instead of target_steps
    (SELECT COALESCE(SUM(ac.goal_steps), 0)::INTEGER 
     FROM user_challenges uc 
     JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
     WHERE uc.user_id = p_user_id 
     AND uc.status IN ('completed', 'claimed')) as total_distance_meters,
    
    -- Current streak (improved calculation)
    (SELECT COUNT(DISTINCT DATE(completed_at))::INTEGER
     FROM user_challenges
     WHERE user_id = p_user_id
     AND status IN ('completed', 'claimed')
     AND completed_at >= NOW() - INTERVAL '7 days') as current_streak_days,
    
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
     AND team_id IS NOT NULL 
     AND status IN ('completed', 'claimed')) as team_challenges_completed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix trigger to check for BOTH 'completed' AND 'claimed' status
CREATE OR REPLACE FUNCTION trigger_check_achievements()
RETURNS TRIGGER AS $$
BEGIN
  -- Check on completion OR claim
  IF NEW.status IN ('completed', 'claimed') 
     AND (OLD.status IS NULL OR OLD.status NOT IN ('completed', 'claimed')) 
     AND NEW.user_id IS NOT NULL THEN
    PERFORM check_and_unlock_achievements(NEW.user_id);
    RAISE NOTICE 'Checking achievements for user: %', NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Recreate trigger
DROP TRIGGER IF EXISTS check_achievements_on_completion ON user_challenges;
CREATE TRIGGER check_achievements_on_completion
  AFTER INSERT OR UPDATE ON user_challenges
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_achievements();

-- 4. Manual check: Run achievement check for all users who have completed challenges
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  FOR v_user_id IN 
    SELECT DISTINCT user_id 
    FROM user_challenges 
    WHERE status IN ('completed', 'claimed')
      AND user_id IS NOT NULL
  LOOP
    PERFORM check_and_unlock_achievements(v_user_id);
    RAISE NOTICE 'Checked achievements for user: %', v_user_id;
  END LOOP;
END $$;

-- 5. Debug: Show results
SELECT 
  u.email,
  u.display_name,
  COUNT(DISTINCT uc.id) FILTER (WHERE uc.status IN ('completed', 'claimed')) as completed_challenges,
  COUNT(DISTINCT ub.id) as badges_unlocked,
  array_agg(DISTINCT ad.title) FILTER (WHERE ub.id IS NOT NULL) as unlocked_badges
FROM users u
LEFT JOIN user_challenges uc ON u.id = uc.user_id
LEFT JOIN user_badges ub ON u.id = ub.user_id
LEFT JOIN achievement_definitions ad ON ub.achievement_id = ad.id
WHERE u.is_guest = false
GROUP BY u.id, u.email, u.display_name
ORDER BY completed_challenges DESC;

COMMENT ON FUNCTION get_user_achievement_stats IS 'Fixed: Uses goal_steps, includes claimed status, better streak calculation';
COMMENT ON FUNCTION trigger_check_achievements IS 'Fixed: Triggers on both completed and claimed status';
