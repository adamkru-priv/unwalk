-- ============================================
-- MOVEE: Fix Push Notifications
-- Migration 045
--
-- Fixes:
-- 1. Trigger for challenge_completed wasn't firing
-- 2. Notifications lack details (number of steps)
-- 3. Conflict between ready_to_claim and completed triggers
-- ============================================

BEGIN;

-- ============================================
-- 1) Update challenge_started to include step goal
-- ============================================
CREATE OR REPLACE FUNCTION public.enqueue_challenge_started_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_goal_steps INT;
BEGIN
  -- Only notify authenticated users
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get challenge title and goal
  SELECT COALESCE(ac.title, 'Challenge'), ac.goal_steps INTO v_title, v_goal_steps
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  -- Enqueue notification with step details
  INSERT INTO public.push_outbox (user_id, type, title, body, data)
  VALUES (
    NEW.user_id,
    'challenge_started',
    'MOVEE 🚀',
    'Rozpocząłeś wyzwanie: ' || v_title || ' (' || COALESCE(v_goal_steps::text, '0') || ' kroków)',
    jsonb_build_object(
      'type', 'challenge_started',
      'user_challenge_id', NEW.id,
      'admin_challenge_id', NEW.admin_challenge_id,
      'goal_steps', v_goal_steps
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2) Fix challenge_completed trigger
-- The issue: notification wasn't being sent because the trigger
-- condition was wrong. We need to send notification when
-- current_steps >= goal_steps, not when status changes to 'completed'
-- ============================================
CREATE OR REPLACE FUNCTION public.enqueue_challenge_completed_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_goal_steps INT;
  v_old_percent INT;
  v_new_percent INT;
BEGIN
  -- Only for active challenges
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;

  -- Only notify authenticated users
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get challenge details
  SELECT COALESCE(ac.title, 'Challenge'), ac.goal_steps INTO v_title, v_goal_steps
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  -- Skip if no goal
  IF v_goal_steps IS NULL OR v_goal_steps = 0 THEN
    RETURN NEW;
  END IF;

  -- Calculate progress
  v_old_percent := (COALESCE(OLD.current_steps, 0) * 100) / v_goal_steps;
  v_new_percent := (NEW.current_steps * 100) / v_goal_steps;

  -- Send notification when crossing 100%
  IF v_old_percent < 100 AND v_new_percent >= 100 THEN
    INSERT INTO public.push_outbox (user_id, type, title, body, data)
    VALUES (
      NEW.user_id,
      'challenge_completed',
      'Gratulacje! 🎉',
      'Ukończyłeś wyzwanie: ' || v_title || ' (' || v_goal_steps::text || ' kroków)',
      jsonb_build_object(
        'type', 'challenge_completed',
        'user_challenge_id', NEW.id,
        'admin_challenge_id', NEW.admin_challenge_id,
        'current_steps', NEW.current_steps,
        'goal_steps', v_goal_steps
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3) Update ready_to_claim trigger to avoid conflict
-- Only send this when user manually marks as completed (status change)
-- ============================================
CREATE OR REPLACE FUNCTION public.enqueue_ready_to_claim_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_points INT;
  v_goal_steps INT;
BEGIN
  -- Only when status changes to completed
  IF OLD.status = 'completed' OR NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Only notify authenticated users
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get challenge details
  SELECT COALESCE(ac.title, 'Challenge'), COALESCE(ac.points, 0), ac.goal_steps 
  INTO v_title, v_points, v_goal_steps
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  -- Notify user to claim reward (this happens AFTER they already got completion notification)
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

-- ============================================
-- 4) Update milestone trigger to include step details
-- ============================================
CREATE OR REPLACE FUNCTION public.enqueue_milestone_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_goal_steps INT;
  v_progress_percent INT;
  v_milestone INT;
  v_old_progress_percent INT;
BEGIN
  -- Only for active challenges
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;

  -- Only notify authenticated users
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get challenge details
  SELECT COALESCE(ac.title, 'Challenge'), ac.goal_steps INTO v_title, v_goal_steps
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  -- Skip if no goal
  IF v_goal_steps IS NULL OR v_goal_steps = 0 THEN
    RETURN NEW;
  END IF;

  -- Calculate progress percentage
  v_progress_percent := (NEW.current_steps * 100) / v_goal_steps;
  v_old_progress_percent := (COALESCE(OLD.current_steps, 0) * 100) / v_goal_steps;

  -- Check if we crossed 50% or 75% milestone
  v_milestone := NULL;
  
  IF v_old_progress_percent < 50 AND v_progress_percent >= 50 THEN
    v_milestone := 50;
  ELSIF v_old_progress_percent < 75 AND v_progress_percent >= 75 THEN
    v_milestone := 75;
  END IF;

  -- If milestone reached, notify with step details
  IF v_milestone IS NOT NULL THEN
    INSERT INTO public.push_outbox (user_id, type, title, body, data)
    VALUES (
      NEW.user_id,
      'milestone_reached',
      'Świetna robota! 💪',
      'Osiągnąłeś ' || v_milestone || '% wyzwania: ' || v_title || ' (' || NEW.current_steps::text || '/' || v_goal_steps::text || ' kroków)',
      jsonb_build_object(
        'type', 'milestone_reached',
        'user_challenge_id', NEW.id,
        'admin_challenge_id', NEW.admin_challenge_id,
        'milestone', v_milestone,
        'current_steps', NEW.current_steps,
        'goal_steps', v_goal_steps
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5) Recreate triggers with correct conditions
-- ============================================

-- Started trigger - fires on INSERT
DROP TRIGGER IF EXISTS trg_push_challenge_started ON public.user_challenges;
CREATE TRIGGER trg_push_challenge_started
  AFTER INSERT ON public.user_challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_challenge_started_push();

-- Completed trigger - fires on UPDATE when crossing 100%
-- Changed from status change to progress change!
DROP TRIGGER IF EXISTS trg_push_challenge_completed ON public.user_challenges;
CREATE TRIGGER trg_push_challenge_completed
  AFTER UPDATE ON public.user_challenges
  FOR EACH ROW
  WHEN (OLD.current_steps IS DISTINCT FROM NEW.current_steps AND NEW.status = 'active')
  EXECUTE FUNCTION public.enqueue_challenge_completed_push();

-- Ready to claim trigger - fires on status change to 'completed'
DROP TRIGGER IF EXISTS trg_push_ready_to_claim ON public.user_challenges;
CREATE TRIGGER trg_push_ready_to_claim
  AFTER UPDATE ON public.user_challenges
  FOR EACH ROW
  WHEN (OLD.status = 'active' AND NEW.status = 'completed')
  EXECUTE FUNCTION public.enqueue_ready_to_claim_push();

-- Milestone trigger - fires on step progress
DROP TRIGGER IF EXISTS trg_push_milestone ON public.user_challenges;
CREATE TRIGGER trg_push_milestone
  AFTER UPDATE ON public.user_challenges
  FOR EACH ROW
  WHEN (OLD.current_steps IS DISTINCT FROM NEW.current_steps)
  EXECUTE FUNCTION public.enqueue_milestone_push();

COMMIT;

-- ============================================
-- Summary of changes:
-- ============================================
-- 1. challenge_started now includes step goal in message
-- 2. challenge_completed now fires when crossing 100% progress (not status change)
-- 3. ready_to_claim fires separately when status changes to 'completed'
-- 4. milestone notifications include step details
-- 5. All triggers use correct conditions to avoid conflicts
-- ============================================
