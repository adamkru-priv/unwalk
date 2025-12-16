-- ============================================
-- MOVEE: Fix Achievement Stats Column Name
-- Migration 040
-- ============================================

-- Fix get_user_achievement_stats to use correct column name (goal_steps not target_steps)
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
    -- Total completed challenges
    (SELECT COUNT(*)::INTEGER FROM user_challenges WHERE user_id = p_user_id AND status = 'completed') as total_completed,
    
    -- Total distance walked (sum of all completed challenges) - FIXED: goal_steps not target_steps
    (SELECT COALESCE(SUM(ac.goal_steps), 0)::INTEGER 
     FROM user_challenges uc 
     JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
     WHERE uc.user_id = p_user_id AND uc.status = 'completed') as total_distance_meters,
    
    -- Current streak (simplified - TODO: improve with real streak tracking)
    (SELECT 0::INTEGER) as current_streak_days,
    
    -- Active days this month
    (SELECT COUNT(DISTINCT DATE(started_at))::INTEGER 
     FROM user_challenges 
     WHERE user_id = p_user_id 
     AND started_at >= date_trunc('month', NOW())
     AND status IN ('active', 'completed')) as active_days_this_month,
    
    -- Team challenges completed
    (SELECT COUNT(*)::INTEGER 
     FROM user_challenges 
     WHERE user_id = p_user_id 
     AND assigned_by IS NOT NULL 
     AND status = 'completed') as team_challenges_completed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_achievement_stats IS 'Get user stats for achievement checking - uses goal_steps column';
