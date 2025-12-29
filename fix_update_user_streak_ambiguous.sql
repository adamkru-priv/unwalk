-- Fix "column user_id is ambiguous" error in update_user_streak function
-- Use table aliases to make column references explicit

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
  -- Get current streak data (use table alias)
  SELECT u.last_activity_date, u.current_streak, u.longest_streak
  INTO v_last_activity, v_current_streak, v_longest_streak
  FROM public.users u
  WHERE u.id = p_user_id;
  
  -- Calculate new streak
  IF v_last_activity IS NULL OR v_last_activity < CURRENT_DATE - INTERVAL '1 day' THEN
    v_new_streak := 1;
  ELSIF v_last_activity = CURRENT_DATE - INTERVAL '1 day' THEN
    v_new_streak := v_current_streak + 1;
    
    -- Award streak bonuses at milestones
    IF v_new_streak = 3 THEN
      v_bonus_xp := 15;
    ELSIF v_new_streak = 7 THEN
      v_bonus_xp := 50;
    ELSIF v_new_streak = 14 THEN
      v_bonus_xp := 100;
    ELSIF v_new_streak = 30 THEN
      v_bonus_xp := 300;
    ELSIF v_new_streak % 7 = 0 THEN
      v_bonus_xp := 30;
    END IF;
  ELSE
    v_new_streak := v_current_streak;
  END IF;
  
  -- Update user (use table alias)
  UPDATE public.users u
  SET current_streak = v_new_streak,
      longest_streak = GREATEST(v_longest_streak, v_new_streak),
      last_activity_date = CURRENT_DATE,
      updated_at = NOW()
  WHERE u.id = p_user_id;
  
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_user_streak(UUID) TO authenticated, anon;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed update_user_streak() function';
  RAISE NOTICE 'Added table aliases (u.id, u.current_streak, etc.) to avoid ambiguous column names';
END $$;
