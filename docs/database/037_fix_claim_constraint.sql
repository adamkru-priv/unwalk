-- ============================================
-- MOVEE: Fix claim function - update constraint
-- Migration 037
-- ============================================

-- First, check current constraint
DO $$ 
BEGIN
  -- Drop old constraint if exists
  ALTER TABLE user_challenges DROP CONSTRAINT IF EXISTS user_challenges_status_check;
  
  -- Add new constraint that allows 'claimed' status
  ALTER TABLE user_challenges 
  ADD CONSTRAINT user_challenges_status_check 
  CHECK (status IN ('active', 'paused', 'completed', 'claimed', 'abandoned'));
END $$;

-- Fix the claim function to be simpler and more reliable
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
  
  -- Only add points and badges for PRO users with system challenges
  IF v_user_tier = 'pro' AND NOT v_admin_challenge.is_custom THEN
    -- Calculate points
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
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'points', v_points,
    'user_tier', COALESCE(v_user_tier, 'guest')
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION claim_user_challenge IS 'Claims challenge - only PRO users get points and badges';
