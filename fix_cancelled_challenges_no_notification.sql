-- ============================================
-- FIX: Don't send expiry notifications for user-cancelled challenges
-- ============================================

BEGIN;

-- 1. Add 'cancelled' status to user_challenges
ALTER TABLE user_challenges DROP CONSTRAINT IF EXISTS user_challenges_status_check;
ALTER TABLE user_challenges ADD CONSTRAINT user_challenges_status_check
CHECK (status IN ('active', 'paused', 'completed', 'claimed', 'cancelled'));

-- 2. Update check_and_notify_expired_challenges() to ignore cancelled challenges
CREATE OR REPLACE FUNCTION public.check_and_notify_expired_challenges()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_challenge RECORD;
  v_count INTEGER := 0;
BEGIN
  -- Find all active challenges that have expired but notification not sent
  -- 🎯 FIX: Only notify challenges that are ACTIVE (not cancelled by user)
  FOR v_expired_challenge IN
    SELECT 
      uc.id,
      uc.user_id,
      uc.admin_challenge_id,
      uc.current_steps,
      uc.started_at,
      ac.title,
      ac.goal_steps,
      ac.time_limit_hours
    FROM user_challenges uc
    JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
    WHERE uc.status = 'active'  -- ✅ Only active challenges (excludes 'cancelled')
      AND uc.expiry_notification_sent = FALSE
      AND ac.time_limit_hours IS NOT NULL
      AND (uc.started_at + (ac.time_limit_hours || ' hours')::INTERVAL) <= NOW()
  LOOP
    -- Update the challenge to trigger the notification
    UPDATE user_challenges
    SET 
      expiry_notification_sent = TRUE,
      updated_at = NOW()
    WHERE id = v_expired_challenge.id;
    
    -- Manually trigger notification (since UPDATE doesn't trigger BEFORE UPDATE)
    DECLARE
      v_title TEXT;
      v_goal_steps INT;
      v_current_steps INT;
      v_progress INT;
      v_body TEXT;
      v_push_enabled BOOLEAN;
      v_platform_record RECORD;
    BEGIN
      v_title := v_expired_challenge.title;
      v_goal_steps := v_expired_challenge.goal_steps;
      v_current_steps := v_expired_challenge.current_steps;
      
      -- Calculate progress
      IF v_goal_steps > 0 THEN
        v_progress := ROUND((v_current_steps::DECIMAL / v_goal_steps::DECIMAL) * 100);
      ELSE
        v_progress := 0;
      END IF;
      
      -- Check if user has push enabled
      IF v_expired_challenge.user_id IS NOT NULL THEN
        SELECT COALESCE(u.push_enabled, true) INTO v_push_enabled
        FROM public.users u
        WHERE u.id = v_expired_challenge.user_id;
        
        IF v_push_enabled THEN
          -- Build body
          IF v_progress >= 100 THEN
            v_body := 'Time''s up! "' || v_title || '" completed at 100%! Claim your reward now! 🎉';
          ELSIF v_progress >= 50 THEN
            v_body := 'Time''s up! "' || v_title || '" ended at ' || v_progress || '%. Check your result in the app.';
          ELSE
            v_body := 'Challenge "' || v_title || '" has expired. Better luck next time! 💪';
          END IF;
          
          -- Send to all platforms
          FOR v_platform_record IN SELECT * FROM get_user_platforms(v_expired_challenge.user_id)
          LOOP
            INSERT INTO public.push_outbox (user_id, platform, type, title, body, data)
            VALUES (
              v_expired_challenge.user_id,
              v_platform_record.platform,
              'challenge_expired',
              'Challenge Ended! ⏰',
              v_body,
              jsonb_build_object(
                'type', 'challenge_expired',
                'user_challenge_id', v_expired_challenge.id,
                'admin_challenge_id', v_expired_challenge.admin_challenge_id,
                'progress', v_progress,
                'current_steps', v_current_steps,
                'goal_steps', v_goal_steps
              )
            );
          END LOOP;
          
          v_count := v_count + 1;
        END IF;
      END IF;
    END;
  END LOOP;
  
  RETURN v_count;
END;
$$;

COMMIT;

-- ============================================
-- USAGE:
-- ============================================
-- After running this migration:
-- 1. Update frontend deleteUserChallenge() to set status='cancelled' instead of DELETE
-- 2. This ensures users who manually close challenges won't get expiry notifications
-- ============================================
