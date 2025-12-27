-- ============================================
-- MOVEE: Rebalance XP Rewards
-- Migration 050
-- ============================================
-- Reduce XP for daily quests, badges, and streaks
-- Make challenges the primary source of XP progression

-- 1. Update Daily Quest XP generation function
DROP FUNCTION IF EXISTS generate_daily_quest(UUID);

CREATE OR REPLACE FUNCTION generate_daily_quest(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_quest_id UUID;
  v_quest_type TEXT;
  v_target INTEGER;
  v_xp_reward INTEGER;
  v_random INTEGER;
BEGIN
  -- Check if quest already exists for today
  SELECT id INTO v_quest_id
  FROM public.daily_quests
  WHERE user_id = p_user_id AND quest_date = CURRENT_DATE;
  
  IF v_quest_id IS NOT NULL THEN
    RETURN v_quest_id;
  END IF;
  
  -- Generate random quest with REDUCED XP rewards
  v_random := floor(random() * 3);
  
  IF v_random = 0 THEN
    -- Steps quest
    v_quest_type := 'steps';
    v_target := 3000 + floor(random() * 5000); -- 3k-8k steps
    v_xp_reward := 20; -- Was: 50 XP
  ELSIF v_random = 1 THEN
    -- Challenge progress quest
    v_quest_type := 'challenge_progress';
    v_target := 10 + floor(random() * 20); -- 10-30% progress
    v_xp_reward := 30; -- Was: 100 XP
  ELSE
    -- Social quest
    v_quest_type := 'social';
    v_target := 1;
    v_xp_reward := 25; -- Was: 75 XP
  END IF;
  
  -- Create quest
  INSERT INTO public.daily_quests (user_id, quest_date, quest_type, target_value, xp_reward)
  VALUES (p_user_id, CURRENT_DATE, v_quest_type, v_target, v_xp_reward)
  RETURNING id INTO v_quest_id;
  
  RETURN v_quest_id;
END;
$$;

-- 2. Update Streak Bonus XP function
DROP FUNCTION IF EXISTS update_user_streak(UUID);

CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS TABLE(current_streak INTEGER, streak_bonus_xp INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  v_last_activity DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_new_streak INTEGER;
  v_bonus_xp INTEGER := 0;
BEGIN
  -- Get current streak data
  SELECT last_activity_date, current_streak, longest_streak
  INTO v_last_activity, v_current_streak, v_longest_streak
  FROM public.users
  WHERE id = p_user_id;
  
  -- Calculate new streak
  IF v_last_activity IS NULL OR v_last_activity < CURRENT_DATE - INTERVAL '1 day' THEN
    -- Streak broken or first activity
    v_new_streak := 1;
  ELSIF v_last_activity = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Continue streak
    v_new_streak := v_current_streak + 1;
    
    -- Award REDUCED streak bonuses at milestones
    IF v_new_streak = 3 THEN
      v_bonus_xp := 15;   -- Was: 50 XP
    ELSIF v_new_streak = 7 THEN
      v_bonus_xp := 50;   -- Was: 150 XP
    ELSIF v_new_streak = 14 THEN
      v_bonus_xp := 100;  -- Was: 300 XP
    ELSIF v_new_streak = 30 THEN
      v_bonus_xp := 300;  -- Was: 1000 XP
    ELSIF v_new_streak % 7 = 0 THEN
      -- Every 7 days after 30
      v_bonus_xp := 30;   -- Was: 100 XP
    END IF;
  ELSE
    -- Already counted today
    v_new_streak := v_current_streak;
  END IF;
  
  -- Update user
  UPDATE public.users
  SET current_streak = v_new_streak,
      longest_streak = GREATEST(v_longest_streak, v_new_streak),
      last_activity_date = CURRENT_DATE,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Add streak bonus XP if any
  IF v_bonus_xp > 0 THEN
    PERFORM add_xp_to_user(
      p_user_id,
      v_bonus_xp,
      'streak_bonus',
      NULL,
      format('Streak bonus: %s days', v_new_streak)
    );
  END IF;
  
  RETURN QUERY SELECT v_new_streak, v_bonus_xp;
END;
$$;

-- 3. Update Badge XP rewards in achievement_definitions table
-- Reduce all badge points by ~70% (divide by 3-5)
UPDATE public.achievement_definitions
SET points = CASE
  -- First milestone badges (50 -> 15)
  WHEN condition_type = 'first_challenge' THEN 15
  
  -- Challenge count badges
  WHEN condition_type = 'total_challenges' AND condition_value = 5 THEN 30   -- Was likely ~100
  WHEN condition_type = 'total_challenges' AND condition_value = 10 THEN 50  -- Was likely ~150
  WHEN condition_type = 'total_challenges' AND condition_value = 25 THEN 80  -- Was likely ~250
  WHEN condition_type = 'total_challenges' AND condition_value = 50 THEN 120 -- Was likely ~400
  
  -- Distance badges
  WHEN condition_type = 'total_distance' AND condition_value <= 50000 THEN 40   -- 50km - Was ~150
  WHEN condition_type = 'total_distance' AND condition_value <= 100000 THEN 60  -- 100km - Was ~250
  WHEN condition_type = 'total_distance' AND condition_value <= 500000 THEN 100 -- 500km - Was ~400
  
  -- Streak badges
  WHEN condition_type = 'streak_days' AND condition_value = 7 THEN 40   -- Was ~100
  WHEN condition_type = 'streak_days' AND condition_value = 14 THEN 60  -- Was ~200
  WHEN condition_type = 'streak_days' AND condition_value = 30 THEN 100 -- Was ~300
  
  -- Team/Social badges
  WHEN condition_type = 'team_challenge' THEN 50  -- Was ~120
  
  -- Active days
  WHEN condition_type = 'active_days_month' THEN 40 -- Was ~100
  
  -- Default: reduce by 70% (multiply by 0.3)
  ELSE GREATEST(10, FLOOR(points * 0.3))
END
WHERE points IS NOT NULL;

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_daily_quest(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_user_streak(UUID) TO authenticated, anon;

-- Comments
COMMENT ON FUNCTION generate_daily_quest IS 'Generate daily quest with rebalanced XP rewards (reduced by ~60%)';
COMMENT ON FUNCTION update_user_streak IS 'Update user streak with rebalanced bonus XP (reduced by ~70%)';

-- Summary of changes
DO $$
BEGIN
  RAISE NOTICE '✅ XP Rebalancing Complete:';
  RAISE NOTICE '  • Daily Quests: 20-30 XP (was 50-100 XP)';
  RAISE NOTICE '  • Streak Bonuses: 15-300 XP (was 50-1000 XP)';
  RAISE NOTICE '  • Badges: 15-120 XP (was 50-400 XP)';
  RAISE NOTICE '  • Challenges: 25-200 XP (increased in frontend)';
  RAISE NOTICE '';
  RAISE NOTICE 'Challenges are now the PRIMARY source of XP! 🚀';
END $$;
