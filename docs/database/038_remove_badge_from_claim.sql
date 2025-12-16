-- ============================================
-- MOVEE: Remove badge insertion from claim function
-- Migration 038
-- ============================================
-- Problem: claim_user_challenge tries to insert admin_challenge_id into user_badges.achievement_id
-- but these are different tables. Badges should be handled separately.

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
  v_points INTEGER := 0;
  v_user_tier TEXT;
BEGIN
  -- Get the challenge
  SELECT * INTO v_challenge
  FROM user_challenges
  WHERE id = p_challenge_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;
  
  -- If already claimed, return success
  IF v_challenge.status = 'claimed' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_claimed', true,
      'points', 0
    );
  END IF;
  
  -- Update to claimed status
  UPDATE user_challenges
  SET 
    status = 'claimed',
    claimed_at = NOW()
  WHERE id = p_challenge_id;
  
  -- Get admin challenge info
  SELECT * INTO v_admin_challenge
  FROM admin_challenges
  WHERE id = v_challenge.admin_challenge_id;
  
  -- Get user tier (check if user exists and is pro)
  SELECT tier INTO v_user_tier
  FROM public.users
  WHERE id = p_user_id;
  
  -- Only add points for PRO users with system challenges
  IF v_user_tier = 'pro' AND NOT v_admin_challenge.is_custom THEN
    -- Calculate points based on difficulty
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
    
    -- Add points to user
    UPDATE public.users
    SET 
      total_points = COALESCE(total_points, 0) + v_points,
      updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Note: Badges are handled separately by check_and_unlock_achievements()
    -- which is triggered automatically when challenge status changes to 'completed'
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'points', v_points,
    'user_tier', COALESCE(v_user_tier, 'guest')
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION claim_user_challenge IS 'Claims challenge and awards points for PRO users. Badges are handled separately.';
