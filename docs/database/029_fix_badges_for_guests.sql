-- Fix badges system to work with both guest users (device_id) and authenticated users (user_id)

-- Step 1: Add device_id to user_badges table to support guest users
ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS device_id TEXT;
ALTER TABLE user_badges DROP CONSTRAINT IF EXISTS user_badges_user_id_achievement_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS user_badges_user_device_achievement 
  ON user_badges(COALESCE(user_id::TEXT, ''), COALESCE(device_id, ''), achievement_id);

-- Step 2: Update get_user_achievement_stats to work with both user_id and device_id
CREATE OR REPLACE FUNCTION get_user_achievement_stats(p_user_id UUID DEFAULT NULL, p_device_id TEXT DEFAULT NULL)
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
    (SELECT COUNT(*)::INTEGER 
     FROM user_challenges 
     WHERE (p_user_id IS NOT NULL AND user_id = p_user_id) 
        OR (p_device_id IS NOT NULL AND device_id = p_device_id)
        AND status = 'completed') as total_completed,
    
    -- Total distance walked (sum of all completed challenges)
    (SELECT COALESCE(SUM(ac.goal_steps), 0)::INTEGER 
     FROM user_challenges uc 
     JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
     WHERE ((p_user_id IS NOT NULL AND uc.user_id = p_user_id) 
         OR (p_device_id IS NOT NULL AND uc.device_id = p_device_id))
        AND uc.status = 'completed') as total_distance_meters,
    
    -- Current streak (simplified - TODO: improve with real streak tracking)
    (SELECT 0::INTEGER) as current_streak_days,
    
    -- Active days this month
    (SELECT COUNT(DISTINCT DATE(started_at))::INTEGER 
     FROM user_challenges 
     WHERE ((p_user_id IS NOT NULL AND user_id = p_user_id) 
         OR (p_device_id IS NOT NULL AND device_id = p_device_id))
        AND started_at >= date_trunc('month', NOW())
        AND status IN ('active', 'completed')) as active_days_this_month,
    
    -- Team challenges completed
    (SELECT COUNT(*)::INTEGER 
     FROM user_challenges 
     WHERE ((p_user_id IS NOT NULL AND user_id = p_user_id) 
         OR (p_device_id IS NOT NULL AND device_id = p_device_id))
        AND assigned_by IS NOT NULL 
        AND status = 'completed') as team_challenges_completed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Update check_and_unlock_achievements to work with both user_id and device_id
CREATE OR REPLACE FUNCTION check_and_unlock_achievements(p_user_id UUID DEFAULT NULL, p_device_id TEXT DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  v_stats RECORD;
  v_achievement RECORD;
  v_unlocked_count INTEGER := 0;
BEGIN
  -- Validate input
  IF p_user_id IS NULL AND p_device_id IS NULL THEN
    RAISE EXCEPTION 'Either user_id or device_id must be provided';
  END IF;

  -- Get user stats
  SELECT * INTO v_stats FROM get_user_achievement_stats(p_user_id, p_device_id);
  
  -- Check each achievement condition
  FOR v_achievement IN 
    SELECT * FROM achievement_definitions ORDER BY sort_order
  LOOP
    -- Skip if already unlocked
    IF EXISTS (
      SELECT 1 FROM user_badges 
      WHERE (p_user_id IS NOT NULL AND user_id = p_user_id) 
         OR (p_device_id IS NOT NULL AND device_id = p_device_id)
        AND achievement_id = v_achievement.id
    ) THEN
      CONTINUE;
    END IF;
    
    -- Check condition
    CASE v_achievement.condition_type
      WHEN 'first_challenge' THEN
        IF v_stats.total_completed >= 1 THEN
          INSERT INTO user_badges (user_id, device_id, achievement_id) 
          VALUES (p_user_id, p_device_id, v_achievement.id);
          v_unlocked_count := v_unlocked_count + 1;
        END IF;
        
      WHEN 'total_challenges' THEN
        IF v_stats.total_completed >= v_achievement.condition_value THEN
          INSERT INTO user_badges (user_id, device_id, achievement_id) 
          VALUES (p_user_id, p_device_id, v_achievement.id);
          v_unlocked_count := v_unlocked_count + 1;
        END IF;
        
      WHEN 'total_distance' THEN
        IF v_stats.total_distance_meters >= v_achievement.condition_value THEN
          INSERT INTO user_badges (user_id, device_id, achievement_id) 
          VALUES (p_user_id, p_device_id, v_achievement.id);
          v_unlocked_count := v_unlocked_count + 1;
        END IF;
        
      WHEN 'streak_days' THEN
        IF v_stats.current_streak_days >= v_achievement.condition_value THEN
          INSERT INTO user_badges (user_id, device_id, achievement_id) 
          VALUES (p_user_id, p_device_id, v_achievement.id);
          v_unlocked_count := v_unlocked_count + 1;
        END IF;
        
      WHEN 'team_challenge' THEN
        IF v_stats.team_challenges_completed >= v_achievement.condition_value THEN
          INSERT INTO user_badges (user_id, device_id, achievement_id) 
          VALUES (p_user_id, p_device_id, v_achievement.id);
          v_unlocked_count := v_unlocked_count + 1;
        END IF;
        
      WHEN 'active_days_month' THEN
        IF v_stats.active_days_this_month >= v_achievement.condition_value THEN
          INSERT INTO user_badges (user_id, device_id, achievement_id) 
          VALUES (p_user_id, p_device_id, v_achievement.id);
          v_unlocked_count := v_unlocked_count + 1;
        END IF;
    END CASE;
  END LOOP;
  
  RETURN v_unlocked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Update trigger to work with both user_id and device_id
CREATE OR REPLACE FUNCTION trigger_check_achievements()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM check_and_unlock_achievements(NEW.user_id, NEW.device_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Update my_badges view to work with both user_id and device_id
CREATE OR REPLACE VIEW my_badges AS
SELECT 
  ad.id,
  ad.title,
  ad.description,
  ad.icon,
  ad.gradient,
  ad.points,
  ad.condition_type,
  ad.condition_value,
  ad.sort_order,
  ub.unlocked_at,
  CASE WHEN ub.id IS NOT NULL THEN true ELSE false END as unlocked
FROM achievement_definitions ad
LEFT JOIN user_badges ub ON ad.id = ub.achievement_id 
  AND (ub.user_id = auth.uid() OR ub.device_id = current_setting('app.device_id', true))
ORDER BY ad.sort_order;

-- Step 6: Update RLS policies
DROP POLICY IF EXISTS "Users can view their own badges" ON user_badges;
CREATE POLICY "Users can view their own badges"
  ON user_badges FOR SELECT
  USING (
    auth.uid() = user_id 
    OR device_id = current_setting('app.device_id', true)
  );

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_achievement_stats(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_and_unlock_achievements(UUID, TEXT) TO anon, authenticated;
