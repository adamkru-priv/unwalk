-- ============================================
-- MOVEE: Recalculate Existing Badge XP
-- Migration 051
-- ============================================
-- One-time fix: Recalculate XP for users who already have badges
-- Remove old badge XP and add new (reduced) badge XP

DO $$
DECLARE
  v_user RECORD;
  v_old_badge_xp INTEGER;
  v_new_badge_xp INTEGER;
  v_xp_difference INTEGER;
  v_new_total_xp INTEGER;
  v_new_level INTEGER;
BEGIN
  -- For each user who has unlocked badges
  FOR v_user IN 
    SELECT DISTINCT u.id, u.xp, u.level
    FROM public.users u
    INNER JOIN user_badges ub ON ub.user_id = u.id
    WHERE u.xp IS NOT NULL
  LOOP
    -- Calculate OLD badge XP (from xp_transactions)
    SELECT COALESCE(SUM(xp_amount), 0) INTO v_old_badge_xp
    FROM xp_transactions
    WHERE user_id = v_user.id 
    AND source_type = 'badge';
    
    -- Calculate NEW badge XP (using updated achievement_definitions.points)
    SELECT COALESCE(SUM(ad.points), 0) INTO v_new_badge_xp
    FROM user_badges ub
    JOIN achievement_definitions ad ON ub.achievement_id = ad.id
    WHERE ub.user_id = v_user.id;
    
    -- Calculate difference
    v_xp_difference := v_old_badge_xp - v_new_badge_xp;
    
    -- Only update if there's a difference
    IF v_xp_difference != 0 THEN
      -- Calculate new total XP
      v_new_total_xp := GREATEST(0, v_user.xp - v_xp_difference);
      
      -- Calculate new level based on new total XP
      v_new_level := 1;
      FOR i IN 2..50 LOOP
        IF v_new_total_xp >= FLOOR(100 * (POWER(1.5, i - 1) - 1) / 0.5) THEN
          v_new_level := i;
        ELSE
          EXIT;
        END IF;
      END LOOP;
      
      -- Update user XP and level
      UPDATE public.users
      SET xp = v_new_total_xp,
          level = v_new_level,
          updated_at = NOW()
      WHERE id = v_user.id;
      
      -- Delete old badge XP transactions
      DELETE FROM xp_transactions
      WHERE user_id = v_user.id 
      AND source_type = 'badge';
      
      -- Re-add badge XP transactions with new values
      -- Note: source_id is NULL because achievement_id is TEXT, not UUID
      INSERT INTO xp_transactions (user_id, xp_amount, source_type, source_id, description)
      SELECT 
        v_user.id,
        ad.points,
        'badge',
        NULL,  -- ✅ Can't use achievement_id (TEXT) in UUID field
        format('Badge unlocked: %s (recalculated)', ad.title)
      FROM user_badges ub
      JOIN achievement_definitions ad ON ub.achievement_id = ad.id
      WHERE ub.user_id = v_user.id;
      
      RAISE NOTICE 'User %: XP adjusted from % to % (-%d from badges), Level % -> %', 
        v_user.id, v_user.xp, v_new_total_xp, v_xp_difference, v_user.level, v_new_level;
    ELSE
      RAISE NOTICE 'User %: No adjustment needed (badge XP already correct)', v_user.id;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Badge XP recalculation complete!';
END $$;
