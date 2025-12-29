-- Fix: Don't send "claim reward" notification when ending incomplete challenge
-- Only send notification if challenge reached 100% completion

CREATE OR REPLACE FUNCTION public.enqueue_ready_to_claim_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_points INT;
  v_goal_steps INT;
  v_push_enabled BOOLEAN;
  v_completion_percent INT;
BEGIN
  -- Check if user has push notifications enabled
  SELECT push_enabled INTO v_push_enabled
  FROM users
  WHERE id = NEW.user_id;
  
  IF NOT COALESCE(v_push_enabled, false) THEN
    RETURN NEW;
  END IF;

  -- Only trigger when status changes from 'active' to 'completed'
  IF OLD.status = 'completed' OR NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get challenge details
  SELECT COALESCE(ac.title, 'Challenge'), COALESCE(ac.points, 0), ac.goal_steps 
  INTO v_title, v_points, v_goal_steps
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  -- 🎯 FIX: Only send notification if challenge was actually completed (100%)
  IF v_goal_steps IS NOT NULL AND v_goal_steps > 0 THEN
    v_completion_percent := (NEW.current_steps * 100) / v_goal_steps;
    
    -- Only send notification if reached 100% or more
    IF v_completion_percent < 100 THEN
      -- Skip notification for incomplete challenges
      RETURN NEW;
    END IF;
  END IF;

  -- Challenge was completed at 100% - send notification
  INSERT INTO public.push_outbox (user_id, type, title, body, data)
  VALUES (
    NEW.user_id,
    'challenge_ready_to_claim',
    'Odbierz nagrodę! 🏆',
    'Zdobądź ' || v_points || ' punktów za ukończenie: ' || v_title,
    jsonb_build_object(
      'type', 'challenge_ready_to_claim',
      'user_challenge_id', NEW.id,
      'admin_challenge_id', NEW.admin_challenge_id,
      'points', v_points,
      'goal_steps', v_goal_steps
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Fixed: End Challenge notification will only be sent at 100%% completion';
END $$;
