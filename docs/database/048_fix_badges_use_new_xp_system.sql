-- ============================================
-- MOVEE: Fix Badges to Use New XP System
-- Migration 048
-- ============================================
-- Update check_and_unlock_achievements to add XP through new gamification system
-- instead of old total_points

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
  v_xp_result RECORD;
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
          
          -- ✅ Add XP through new gamification system
          SELECT * INTO v_xp_result
          FROM add_xp_to_user(
            p_user_id,
            v_achievement.points,
            'badge',
            v_achievement.id,
            format('Badge unlocked: %s', v_achievement.title)
          );
          
          v_unlocked_count := v_unlocked_count + 1;
          
          RAISE NOTICE 'Badge unlocked: % (+% XP, new level: %)', 
            v_achievement.title, v_achievement.points, v_xp_result.new_level;
        END IF;
        
      WHEN 'total_challenges' THEN
        IF v_stats.total_completed >= v_achievement.condition_value THEN
          INSERT INTO user_badges (user_id, achievement_id) 
          VALUES (p_user_id, v_achievement.id);
          
          SELECT * INTO v_xp_result
          FROM add_xp_to_user(
            p_user_id,
            v_achievement.points,
            'badge',
            v_achievement.id,
            format('Badge unlocked: %s', v_achievement.title)
          );
          
          v_unlocked_count := v_unlocked_count + 1;
          
          RAISE NOTICE 'Badge unlocked: % (+% XP, new level: %)', 
            v_achievement.title, v_achievement.points, v_xp_result.new_level;
        END IF;
        
      WHEN 'total_distance' THEN
        IF v_stats.total_distance_meters >= v_achievement.condition_value THEN
          INSERT INTO user_badges (user_id, achievement_id) 
          VALUES (p_user_id, v_achievement.id);
          
          SELECT * INTO v_xp_result
          FROM add_xp_to_user(
            p_user_id,
            v_achievement.points,
            'badge',
            v_achievement.id,
            format('Badge unlocked: %s', v_achievement.title)
          );
          
          v_unlocked_count := v_unlocked_count + 1;
          
          RAISE NOTICE 'Badge unlocked: % (+% XP, new level: %)', 
            v_achievement.title, v_achievement.points, v_xp_result.new_level;
        END IF;
        
      WHEN 'streak_days' THEN
        IF v_stats.current_streak_days >= v_achievement.condition_value THEN
          INSERT INTO user_badges (user_id, achievement_id) 
          VALUES (p_user_id, v_achievement.id);
          
          SELECT * INTO v_xp_result
          FROM add_xp_to_user(
            p_user_id,
            v_achievement.points,
            'badge',
            v_achievement.id,
            format('Badge unlocked: %s', v_achievement.title)
          );
          
          v_unlocked_count := v_unlocked_count + 1;
          
          RAISE NOTICE 'Badge unlocked: % (+% XP, new level: %)', 
            v_achievement.title, v_achievement.points, v_xp_result.new_level;
        END IF;
        
      WHEN 'team_challenge' THEN
        IF v_stats.team_challenges_completed >= v_achievement.condition_value THEN
          INSERT INTO user_badges (user_id, achievement_id) 
          VALUES (p_user_id, v_achievement.id);
          
          SELECT * INTO v_xp_result
          FROM add_xp_to_user(
            p_user_id,
            v_achievement.points,
            'badge',
            v_achievement.id,
            format('Badge unlocked: %s', v_achievement.title)
          );
          
          v_unlocked_count := v_unlocked_count + 1;
          
          RAISE NOTICE 'Badge unlocked: % (+% XP, new level: %)', 
            v_achievement.title, v_achievement.points, v_xp_result.new_level;
        END IF;
        
      WHEN 'active_days_month' THEN
        IF v_stats.active_days_this_month >= v_achievement.condition_value THEN
          INSERT INTO user_badges (user_id, achievement_id) 
          VALUES (p_user_id, v_achievement.id);
          
          SELECT * INTO v_xp_result
          FROM add_xp_to_user(
            p_user_id,
            v_achievement.points,
            'badge',
            v_achievement.id,
            format('Badge unlocked: %s', v_achievement.title)
          );
          
          v_unlocked_count := v_unlocked_count + 1;
          
          RAISE NOTICE 'Badge unlocked: % (+% XP, new level: %)', 
            v_achievement.title, v_achievement.points, v_xp_result.new_level;
        END IF;
    END CASE;
  END LOOP;
  
  RETURN v_unlocked_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_and_unlock_achievements(UUID) TO authenticated, anon;

-- Comments
COMMENT ON FUNCTION check_and_unlock_achievements IS 'Check and unlock achievements, adding badge XP through new gamification system';
