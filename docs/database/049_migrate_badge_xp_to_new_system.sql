-- ============================================
-- MOVEE: Migrate Badge XP to New System
-- Migration 049
-- ============================================
-- One-time migration: Add badge XP to users who already have unlocked badges
-- This ensures total XP is consistent with badges + quests + challenges

DO $$
DECLARE
  v_user RECORD;
  v_badge_xp INTEGER;
  v_result RECORD;
BEGIN
  -- For each user who has unlocked badges
  FOR v_user IN 
    SELECT DISTINCT ub.user_id
    FROM user_badges ub
    WHERE ub.user_id IS NOT NULL
  LOOP
    -- Calculate total XP from their unlocked badges
    SELECT COALESCE(SUM(ad.points), 0) INTO v_badge_xp
    FROM user_badges ub
    JOIN achievement_definitions ad ON ub.achievement_id = ad.id
    WHERE ub.user_id = v_user.user_id;
    
    -- Only add if user has badge XP
    IF v_badge_xp > 0 THEN
      -- Check if they already received badge XP (check xp_transactions)
      IF NOT EXISTS (
        SELECT 1 FROM xp_transactions 
        WHERE user_id = v_user.user_id 
        AND source_type = 'badge'
      ) THEN
        -- Add badge XP to user through new system
        SELECT * INTO v_result
        FROM add_xp_to_user(
          v_user.user_id,
          v_badge_xp,
          'badge',
          NULL,
          'Migration: Badge XP added to new gamification system'
        );
        
        RAISE NOTICE 'User % received % XP from badges (new XP: %, new level: %)', 
          v_user.user_id, v_badge_xp, v_result.new_xp, v_result.new_level;
      ELSE
        RAISE NOTICE 'User % already has badge XP transactions - skipping', v_user.user_id;
      END IF;
    END IF;
  END LOOP;
END $$;

-- Comments
COMMENT ON TABLE xp_transactions IS 'XP transaction history - tracks all XP gains from challenges, quests, badges, streaks';
