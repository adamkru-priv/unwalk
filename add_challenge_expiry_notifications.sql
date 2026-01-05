-- ============================================
-- ADD: Challenge Expiry Notifications (English)
-- Automatically sends notification when challenge deadline passes
-- ============================================

BEGIN;

-- 1. Add expiry_notification_sent column if not exists
ALTER TABLE user_challenges 
ADD COLUMN IF NOT EXISTS expiry_notification_sent BOOLEAN DEFAULT FALSE;

-- 2. Add challenge_expired type to push_outbox constraint
ALTER TABLE public.push_outbox DROP CONSTRAINT IF EXISTS push_outbox_type_check;
ALTER TABLE public.push_outbox ADD CONSTRAINT push_outbox_type_check
CHECK (type IN (
  'challenge_started',
  'challenge_completed',
  'challenge_assigned',
  'challenge_assignment_accepted',
  'challenge_assignment_rejected',
  'challenge_assignment_started',
  'challenge_assignment_completed',
  'team_invitation_received',
  'challenge_expired'
));

-- 3. Function to send expiry notification
CREATE OR REPLACE FUNCTION public.enqueue_challenge_expired_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_goal_steps INT;
  v_current_steps INT;
  v_progress INT;
  v_body TEXT;
  v_push_enabled BOOLEAN;
  v_platform_record RECORD;
BEGIN
  -- Only for active challenges with time limit that just expired
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;
  
  -- Check if already sent notification
  IF NEW.expiry_notification_sent = TRUE THEN
    RETURN NEW;
  END IF;
  
  -- Check if user has push enabled
  IF NEW.user_id IS NOT NULL THEN
    SELECT COALESCE(u.push_enabled, true) INTO v_push_enabled
    FROM public.users u
    WHERE u.id = NEW.user_id;
    
    IF NOT v_push_enabled THEN
      RETURN NEW;
    END IF;
  END IF;
  
  -- Get challenge details
  SELECT 
    COALESCE(ac.title, 'Challenge'),
    ac.goal_steps
  INTO v_title, v_goal_steps
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;
  
  v_current_steps := NEW.current_steps;
  
  -- Calculate progress percentage
  IF v_goal_steps > 0 THEN
    v_progress := ROUND((v_current_steps::DECIMAL / v_goal_steps::DECIMAL) * 100);
  ELSE
    v_progress := 0;
  END IF;
  
  -- Build notification body based on completion
  IF v_progress >= 100 THEN
    v_body := 'Time''s up! "' || v_title || '" completed at 100%! Claim your reward now! 🎉';
  ELSIF v_progress >= 50 THEN
    v_body := 'Time''s up! "' || v_title || '" ended at ' || v_progress || '%. Check your result in the app.';
  ELSE
    v_body := 'Challenge "' || v_title || '" has expired. Better luck next time! 💪';
  END IF;
  
  -- Send notification to all user platforms
  IF NEW.user_id IS NOT NULL THEN
    FOR v_platform_record IN SELECT * FROM get_user_platforms(NEW.user_id)
    LOOP
      INSERT INTO public.push_outbox (user_id, platform, type, title, body, data)
      VALUES (
        NEW.user_id,
        v_platform_record.platform,
        'challenge_expired',
        'Challenge Ended! ⏰',
        v_body,
        jsonb_build_object(
          'type', 'challenge_expired',
          'user_challenge_id', NEW.id,
          'admin_challenge_id', NEW.admin_challenge_id,
          'progress', v_progress,
          'current_steps', v_current_steps,
          'goal_steps', v_goal_steps
        )
      );
    END LOOP;
  END IF;
  
  -- Mark notification as sent
  NEW.expiry_notification_sent := TRUE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create function to check and mark expired challenges
-- This function will be called periodically (every hour) to check for expired challenges
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
    WHERE uc.status = 'active'
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

-- 5. Create a simple cron-like table to track checks
CREATE TABLE IF NOT EXISTS public.challenge_expiry_checks (
  id SERIAL PRIMARY KEY,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  notifications_sent INTEGER DEFAULT 0
);

-- 6. Grant execute permission to authenticated users (for edge functions)
GRANT EXECUTE ON FUNCTION public.check_and_notify_expired_challenges() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_notify_expired_challenges() TO service_role;

COMMIT;

-- ============================================
-- USAGE:
-- ============================================
-- This function should be called every hour by:
-- 1. Supabase Edge Function with cron trigger
-- 2. External cron job (GitHub Actions, Render, etc.)
-- 3. Manual call for testing:
--    SELECT check_and_notify_expired_challenges();
-- ============================================
