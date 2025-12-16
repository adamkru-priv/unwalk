-- ============================================
-- MOVEE: Fix claim function with better debugging
-- Migration 035
-- ============================================

CREATE OR REPLACE FUNCTION claim_user_challenge(
  p_challenge_id UUID,
  p_user_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge RECORD;
  v_admin_challenge RECORD;
  v_points INTEGER;
  v_current_status TEXT;
BEGIN
  -- Debug: Check if challenge exists and get its current status
  SELECT status INTO v_current_status
  FROM user_challenges
  WHERE id = p_challenge_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge with id % does not exist in database', p_challenge_id;
  END IF;
  
  -- If already claimed, return success without doing anything
  IF v_current_status = 'claimed' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_claimed', true,
      'points', 0,
      'challenge_id', p_challenge_id
    );
  END IF;
  
  -- Update challenge to 'claimed' status
  UPDATE user_challenges
  SET 
    status = 'claimed',
    claimed_at = NOW(),
    user_id = COALESCE(user_id, p_user_id)
  WHERE id = p_challenge_id
  RETURNING * INTO v_challenge;
  
  -- Get challenge details for points calculation
  SELECT goal_steps, is_custom INTO v_admin_challenge
  FROM admin_challenges
  WHERE id = v_challenge.admin_challenge_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Admin challenge not found for id %', v_challenge.admin_challenge_id;
  END IF;
  
  -- Calculate points (only for system challenges)
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
    
    -- Add badge
    INSERT INTO user_badges (user_id, badge_id, unlocked_at)
    VALUES (p_user_id, v_challenge.admin_challenge_id, NOW())
    ON CONFLICT (user_id, badge_id) DO NOTHING;
    
    -- Add points
    UPDATE public.users
    SET 
      total_points = COALESCE(total_points, 0) + v_points,
      updated_at = NOW()
    WHERE id = p_user_id;
  ELSE
    v_points := 0;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'already_claimed', false,
    'points', v_points,
    'challenge_id', p_challenge_id
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION claim_user_challenge IS 'Claims completed challenge, adds badge and points (with better error handling)';
