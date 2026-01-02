-- ============================================
-- MOVEE: Fix Custom Challenge XP
-- Migration 062
-- ============================================
-- 1. Custom challenges should NOT award XP (points = 0)
-- 2. Team challenges should award proportional XP based on contribution

BEGIN;

-- Step 1: Set points = 0 for all custom challenges
UPDATE public.admin_challenges
SET points = 0
WHERE is_custom = true;

-- Step 2: Update claim_user_challenge function to handle XP correctly
DROP FUNCTION IF EXISTS claim_user_challenge(UUID, UUID);

CREATE OR REPLACE FUNCTION claim_user_challenge(
  p_challenge_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_challenge RECORD;
  v_admin_challenge RECORD;
  v_points INTEGER;
  v_new_badges INTEGER;
  v_is_team_challenge BOOLEAN;
  v_is_custom BOOLEAN;
  v_total_team_steps INTEGER;
  v_user_contribution INTEGER;
  v_total_xp INTEGER;
  v_proportional_xp INTEGER;
BEGIN
  -- 1. Get user challenge with admin challenge info
  SELECT uc.*, ac.goal_steps, ac.is_custom, ac.is_team_challenge, ac.points as challenge_xp
  INTO v_user_challenge
  FROM user_challenges uc
  JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
  WHERE uc.id = p_challenge_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;
  
  -- Store admin challenge data
  v_admin_challenge := v_user_challenge;
  v_is_team_challenge := COALESCE(v_user_challenge.is_team_challenge, false);
  v_is_custom := COALESCE(v_user_challenge.is_custom, false);
  
  -- 2. Update challenge to 'claimed' status
  UPDATE user_challenges
  SET 
    status = 'claimed',
    claimed_at = NOW(),
    user_id = COALESCE(user_id, p_user_id)
  WHERE id = p_challenge_id;
  
  -- 3. Calculate XP points
  
  -- ✅ FIX: Custom challenges NEVER award XP
  IF v_is_custom THEN
    v_points := 0;
    RAISE NOTICE 'Custom challenge - no XP awarded';
    
  ELSIF v_is_team_challenge THEN
    -- ✅ TEAM CHALLENGE: Calculate proportional XP based on contribution
    
    -- Get total steps completed by all team members
    SELECT COALESCE(SUM(current_steps), 0)
    INTO v_total_team_steps
    FROM user_challenges
    WHERE admin_challenge_id = v_user_challenge.admin_challenge_id
    AND status IN ('completed', 'claimed');
    
    -- Get this user's contribution
    v_user_contribution := v_user_challenge.current_steps;
    
    -- Get total XP from admin_challenge
    IF v_admin_challenge.challenge_xp IS NOT NULL AND v_admin_challenge.challenge_xp > 0 THEN
      v_total_xp := v_admin_challenge.challenge_xp;
    ELSE
      -- Fallback calculation for old challenges
      IF v_admin_challenge.goal_steps <= 50000 THEN
        v_total_xp := 500;
      ELSIF v_admin_challenge.goal_steps <= 100000 THEN
        v_total_xp := 1000;
      ELSE
        v_total_xp := 2500;
      END IF;
    END IF;
    
    -- Calculate proportional XP (avoid division by zero)
    IF v_total_team_steps > 0 THEN
      v_proportional_xp := ROUND((v_user_contribution::DECIMAL / v_total_team_steps::DECIMAL) * v_total_xp);
    ELSE
      v_proportional_xp := 0;
    END IF;
    
    v_points := v_proportional_xp;
    RAISE NOTICE 'Team challenge - proportional XP: % (contribution: %/%)', v_points, v_user_contribution, v_total_team_steps;
    
  ELSE
    -- ✅ SOLO CHALLENGE: Use full XP from admin_challenge
    
    -- Use XP from admin_challenge if available
    IF v_admin_challenge.challenge_xp IS NOT NULL AND v_admin_challenge.challenge_xp > 0 THEN
      v_points := v_admin_challenge.challenge_xp;
    ELSE
      -- Fallback calculation for old challenges
      IF v_admin_challenge.goal_steps <= 5000 THEN
        v_points := 50;
      ELSIF v_admin_challenge.goal_steps <= 15000 THEN
        v_points := 150;
      ELSIF v_admin_challenge.goal_steps <= 50000 THEN
        v_points := 500;
      ELSE
        v_points := 1000;
      END IF;
    END IF;
    
    RAISE NOTICE 'Solo challenge - full XP: %', v_points;
  END IF;
  
  -- 4. Add points to user profile (skip if 0 XP)
  IF v_points > 0 THEN
    UPDATE public.users
    SET 
      total_points = COALESCE(total_points, 0) + v_points,
      updated_at = NOW()
    WHERE id = p_user_id;
    
    RAISE NOTICE 'Added % XP to user %', v_points, p_user_id;
  END IF;
  
  -- 5. Check and unlock achievements (badges)
  v_new_badges := check_and_unlock_achievements(p_user_id);
  
  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'points', v_points,
    'new_badges', v_new_badges,
    'challenge_id', p_challenge_id,
    'is_team_challenge', v_is_team_challenge,
    'is_custom', v_is_custom,
    'user_contribution', v_user_contribution,
    'total_team_steps', v_total_team_steps
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION claim_user_challenge(UUID, UUID) TO authenticated, anon;

-- Comments
COMMENT ON FUNCTION claim_user_challenge IS 'Claim completed challenge with proportional XP for team challenges and no XP for custom challenges';

COMMIT;

-- ============================================
-- Summary
-- ============================================
DO $$
DECLARE
  v_custom_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_custom_count
  FROM admin_challenges
  WHERE is_custom = true;
  
  RAISE NOTICE '✅ Custom challenge XP fix applied!';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  • Custom challenges with points = 0: %', v_custom_count;
  RAISE NOTICE '  • Custom challenges: NO XP';
  RAISE NOTICE '  • Team challenges: Proportional XP based on contribution';
  RAISE NOTICE '  • Solo challenges: Full XP';
END $$;
