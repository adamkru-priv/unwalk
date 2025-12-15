-- Badges & Achievements System

-- Table: achievement_definitions (predefined badges)
CREATE TABLE IF NOT EXISTS achievement_definitions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  gradient TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 50,
  condition_type TEXT NOT NULL CHECK (condition_type IN (
    'first_challenge',
    'streak_days',
    'total_distance',
    'total_challenges',
    'team_challenge',
    'active_days_month'
  )),
  condition_value INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: user_badges (unlocked badges per user)
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_achievement ON user_badges(achievement_id);
CREATE INDEX IF NOT EXISTS idx_achievement_definitions_sort ON achievement_definitions(sort_order);

-- Enable RLS
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for achievement_definitions (public read)
DROP POLICY IF EXISTS "Anyone can view achievement definitions" ON achievement_definitions;
CREATE POLICY "Anyone can view achievement definitions"
  ON achievement_definitions FOR SELECT
  USING (true);

-- RLS Policies for user_badges
DROP POLICY IF EXISTS "Users can view their own badges" ON user_badges;
CREATE POLICY "Users can view their own badges"
  ON user_badges FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert badges" ON user_badges;
CREATE POLICY "System can insert badges"
  ON user_badges FOR INSERT
  WITH CHECK (true); -- Handled by functions

-- Seed achievement definitions
INSERT INTO achievement_definitions (id, title, description, icon, gradient, points, condition_type, condition_value, sort_order) VALUES
  ('first_steps', 'First Steps', 'Complete your first challenge', '👣', 'from-blue-400 to-blue-600', 50, 'first_challenge', 1, 1),
  ('week_warrior', 'Week Warrior', 'Stay active for 7 days', '🔥', 'from-orange-400 to-red-600', 100, 'streak_days', 7, 2),
  ('10k_master', '10K Master', 'Complete a 10K challenge', '⭐', 'from-purple-400 to-purple-600', 150, 'total_distance', 10000, 3),
  ('marathon', 'Marathon', 'Walk 42km in total', '🏃', 'from-green-400 to-green-600', 250, 'total_distance', 42000, 4),
  ('streak_7', 'Streak 7', 'Maintain a 7-day streak', '💪', 'from-pink-400 to-pink-600', 100, 'streak_days', 7, 5),
  ('explorer', 'Explorer', 'Try 5 different challenges', '🌍', 'from-cyan-400 to-cyan-600', 120, 'total_challenges', 5, 6),
  ('distance_king', 'Distance King', 'Walk 100km in total', '🚀', 'from-indigo-400 to-indigo-600', 300, 'total_distance', 100000, 7),
  ('team_player', 'Team Player', 'Complete a team challenge', '👥', 'from-amber-400 to-amber-600', 150, 'team_challenge', 1, 8),
  ('consistent', 'Consistent', 'Active 20 days this month', '📅', 'from-teal-400 to-teal-600', 200, 'active_days_month', 20, 9)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  gradient = EXCLUDED.gradient,
  points = EXCLUDED.points,
  condition_type = EXCLUDED.condition_type,
  condition_value = EXCLUDED.condition_value,
  sort_order = EXCLUDED.sort_order;

-- Function: Get user stats for achievements
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
    
    -- Total distance walked (sum of all completed challenges)
    (SELECT COALESCE(SUM(ac.target_steps), 0)::INTEGER 
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

-- Function: Check and unlock achievements
CREATE OR REPLACE FUNCTION check_and_unlock_achievements(p_user_id UUID)
RETURNS INTEGER AS $$
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
    IF EXISTS (SELECT 1 FROM user_badges WHERE user_id = p_user_id AND achievement_id = v_achievement.id) THEN
      CONTINUE;
    END IF;
    
    -- Check condition
    CASE v_achievement.condition_type
      WHEN 'first_challenge' THEN
        IF v_stats.total_completed >= 1 THEN
          INSERT INTO user_badges (user_id, achievement_id) VALUES (p_user_id, v_achievement.id);
          v_unlocked_count := v_unlocked_count + 1;
        END IF;
        
      WHEN 'total_challenges' THEN
        IF v_stats.total_completed >= v_achievement.condition_value THEN
          INSERT INTO user_badges (user_id, achievement_id) VALUES (p_user_id, v_achievement.id);
          v_unlocked_count := v_unlocked_count + 1;
        END IF;
        
      WHEN 'total_distance' THEN
        IF v_stats.total_distance_meters >= v_achievement.condition_value THEN
          INSERT INTO user_badges (user_id, achievement_id) VALUES (p_user_id, v_achievement.id);
          v_unlocked_count := v_unlocked_count + 1;
        END IF;
        
      WHEN 'streak_days' THEN
        IF v_stats.current_streak_days >= v_achievement.condition_value THEN
          INSERT INTO user_badges (user_id, achievement_id) VALUES (p_user_id, v_achievement.id);
          v_unlocked_count := v_unlocked_count + 1;
        END IF;
        
      WHEN 'team_challenge' THEN
        IF v_stats.team_challenges_completed >= v_achievement.condition_value THEN
          INSERT INTO user_badges (user_id, achievement_id) VALUES (p_user_id, v_achievement.id);
          v_unlocked_count := v_unlocked_count + 1;
        END IF;
        
      WHEN 'active_days_month' THEN
        IF v_stats.active_days_this_month >= v_achievement.condition_value THEN
          INSERT INTO user_badges (user_id, achievement_id) VALUES (p_user_id, v_achievement.id);
          v_unlocked_count := v_unlocked_count + 1;
        END IF;
    END CASE;
  END LOOP;
  
  RETURN v_unlocked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View: My badges with points
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
LEFT JOIN user_badges ub ON ad.id = ub.achievement_id AND ub.user_id = auth.uid()
ORDER BY ad.sort_order;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_achievement_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_unlock_achievements(UUID) TO authenticated;
GRANT SELECT ON my_badges TO authenticated;

-- Trigger: Auto-check achievements when challenge completed
CREATE OR REPLACE FUNCTION trigger_check_achievements()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM check_and_unlock_achievements(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_achievements_on_completion ON user_challenges;
CREATE TRIGGER check_achievements_on_completion
  AFTER INSERT OR UPDATE ON user_challenges
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_achievements();

COMMENT ON TABLE achievement_definitions IS 'Predefined achievements (badges) that users can unlock';
COMMENT ON TABLE user_badges IS 'Badges unlocked by users with timestamp';
COMMENT ON FUNCTION check_and_unlock_achievements IS 'Check user stats and unlock achievements automatically';
