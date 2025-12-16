-- ============================================
-- MOVEE: Fix Claim Challenge to Check Achievements
-- Migration 039
-- ============================================

-- Update claim_user_challenge function to call check_and_unlock_achievements
CREATE OR REPLACE FUNCTION claim_user_challenge(
  p_challenge_id UUID,
  p_user_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_challenge RECORD;
  v_admin_challenge RECORD;
  v_points INTEGER;
BEGIN
  -- 1. Update challenge to 'claimed' status and set user_id if missing
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
  
  -- 2. Get challenge details for points calculation
  SELECT goal_steps, is_custom INTO v_admin_challenge
  FROM admin_challenges
  WHERE id = v_user_challenge.admin_challenge_id;
  
  -- 3. Calculate points (only for system challenges)
  IF NOT v_admin_challenge.is_custom THEN
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
    
    -- 4. Add points to user profile
    UPDATE public.users
    SET 
      total_points = COALESCE(total_points, 0) + v_points,
      updated_at = NOW()
    WHERE id = p_user_id;
    
    -- 5. ✅ CHECK AND UNLOCK ACHIEVEMENTS (badges)
    -- This will check if user qualifies for any badges and unlock them
    PERFORM check_and_unlock_achievements(p_user_id);
    
  ELSE
    v_points := 0;
  END IF;
  
  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'points', v_points,
    'challenge_id', p_challenge_id
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION claim_user_challenge IS 'Claims completed challenge, adds points and checks achievements (bypasses RLS)';
