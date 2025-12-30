-- Add 'daily_steps' as a valid XP source type
-- This allows Daily Steps Reward to appear in Challenge History

-- Drop ALL existing versions of the function using CASCADE
-- This will remove all overloaded versions regardless of parameter count
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT oid::regprocedure 
        FROM pg_proc 
        WHERE proname = 'add_xp_to_user'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.oid::regprocedure || ' CASCADE';
    END LOOP;
END $$;

-- Recreate with updated source_type enum
CREATE OR REPLACE FUNCTION add_xp_to_user(
  p_user_id UUID,
  p_xp_amount INTEGER,
  p_source_type TEXT, -- 'challenge', 'daily_quest', 'streak_bonus', 'badge', 'milestone', 'manual', 'daily_steps'
  p_source_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE (
  new_xp INTEGER,
  new_level INTEGER,
  leveled_up BOOLEAN
) AS $$
DECLARE
  v_current_xp INTEGER;
  v_current_level INTEGER;
  v_new_xp INTEGER;
  v_new_level INTEGER;
  v_xp_for_next_level INTEGER;
BEGIN
  -- Get current XP and level
  SELECT xp, level INTO v_current_xp, v_current_level
  FROM users
  WHERE id = p_user_id;

  -- Calculate new XP
  v_new_xp := v_current_xp + p_xp_amount;

  -- Calculate new level (exponential growth: 100 * (1.5^(level-1) - 1) / 0.5)
  v_new_level := v_current_level;
  
  LOOP
    v_xp_for_next_level := FLOOR(100 * (POWER(1.5, v_new_level) - 1) / 0.5);
    EXIT WHEN v_new_xp < v_xp_for_next_level OR v_new_level >= 50;
    v_new_level := v_new_level + 1;
  END LOOP;

  -- Update user's XP and level
  UPDATE users
  SET 
    xp = v_new_xp,
    level = v_new_level,
    last_activity_date = NOW()
  WHERE id = p_user_id;

  -- Insert XP transaction record (for history)
  INSERT INTO xp_transactions (user_id, xp_amount, source_type, source_id, description)
  VALUES (p_user_id, p_xp_amount, p_source_type, p_source_id, p_description);

  -- Return result
  RETURN QUERY SELECT v_new_xp, v_new_level, (v_new_level > v_current_level);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION add_xp_to_user IS 'Add XP to user with level-up logic. Now supports daily_steps source type.';
