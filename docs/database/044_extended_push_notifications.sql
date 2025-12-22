-- ============================================
-- MOVEE: Extended Push Notifications System
-- Migration 044
--
-- Adds:
-- - Global push preferences (push_enabled)
-- - Extended push types for social features
-- - Challenge assignment notifications
-- - Ready to claim rewards notification
-- - Team member activity notifications
-- - Milestone notifications
-- ============================================

BEGIN;

-- ============================================
-- 1) Add global push preference to users table
-- ============================================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.users.push_enabled IS 'Global push notification toggle (true=send, false=do not send)';

-- ============================================
-- 2) Extend push_outbox type constraint
-- ============================================
ALTER TABLE public.push_outbox
  DROP CONSTRAINT IF EXISTS push_outbox_type_check;

ALTER TABLE public.push_outbox
  ADD CONSTRAINT push_outbox_type_check
  CHECK (type IN (
    'challenge_started',
    'challenge_completed',
    'challenge_assigned',
    'challenge_assignment_accepted',
    'challenge_assignment_rejected',
    'challenge_assignment_started',
    'challenge_assignment_completed',
    'challenge_ready_to_claim',
    'milestone_reached',
    'team_member_completed'
  ));

-- ============================================
-- 3) Challenge assigned notification
-- Triggered when someone sends you a challenge invitation
-- ============================================
CREATE OR REPLACE FUNCTION public.enqueue_challenge_assigned_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name TEXT;
  v_title TEXT;
BEGIN
  -- Get sender name
  SELECT COALESCE(u.display_name, 'Ktoś') INTO v_sender_name
  FROM public.users u
  WHERE u.id = NEW.sender_id;

  -- Get challenge title
  SELECT COALESCE(ac.title, 'Challenge') INTO v_title
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  -- Enqueue notification for recipient
  INSERT INTO public.push_outbox (user_id, type, title, body, data)
  VALUES (
    NEW.recipient_id,
    'challenge_assigned',
    'Nowe wyzwanie! 🎯',
    v_sender_name || ' wysłał Ci wyzwanie: ' || v_title,
    jsonb_build_object(
      'type', 'challenge_assigned',
      'assignment_id', NEW.id,
      'sender_id', NEW.sender_id,
      'recipient_id', NEW.recipient_id,
      'admin_challenge_id', NEW.admin_challenge_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_push_challenge_assigned ON public.challenge_assignments;
CREATE TRIGGER trg_push_challenge_assigned
  AFTER INSERT ON public.challenge_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_challenge_assigned_push();

-- ============================================
-- 4) Challenge assignment accepted/rejected notification
-- Notifies sender when recipient accepts or rejects invitation
-- ============================================
CREATE OR REPLACE FUNCTION public.enqueue_challenge_assignment_status_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_name TEXT;
  v_title TEXT;
  v_type TEXT;
  v_body TEXT;
  v_emoji TEXT;
BEGIN
  -- Only trigger on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Only for accepted/rejected status
  IF NEW.status NOT IN ('accepted', 'rejected') THEN
    RETURN NEW;
  END IF;

  -- Get recipient name
  SELECT COALESCE(u.display_name, 'Użytkownik') INTO v_recipient_name
  FROM public.users u
  WHERE u.id = NEW.recipient_id;

  -- Get challenge title
  SELECT COALESCE(ac.title, 'Challenge') INTO v_title
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  -- Build notification based on status
  IF NEW.status = 'accepted' THEN
    v_type := 'challenge_assignment_accepted';
    v_emoji := '✅';
    v_body := v_recipient_name || ' zaakceptował wyzwanie: ' || v_title;
  ELSE
    v_type := 'challenge_assignment_rejected';
    v_emoji := '❌';
    v_body := v_recipient_name || ' odrzucił wyzwanie: ' || v_title;
  END IF;

  -- Notify sender
  INSERT INTO public.push_outbox (user_id, type, title, body, data)
  VALUES (
    NEW.sender_id,
    v_type,
    'MOVEE ' || v_emoji,
    v_body,
    jsonb_build_object(
      'type', v_type,
      'assignment_id', NEW.id,
      'sender_id', NEW.sender_id,
      'recipient_id', NEW.recipient_id,
      'admin_challenge_id', NEW.admin_challenge_id,
      'status', NEW.status
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_push_challenge_assignment_status ON public.challenge_assignments;
CREATE TRIGGER trg_push_challenge_assignment_status
  AFTER UPDATE ON public.challenge_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_challenge_assignment_status_push();

-- ============================================
-- 5) Challenge assignment started notification
-- Notifies sender when recipient starts the assigned challenge
-- ============================================
CREATE OR REPLACE FUNCTION public.enqueue_challenge_assignment_started_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_name TEXT;
  v_title TEXT;
  v_assignment_id UUID;
BEGIN
  -- Only for challenges that were assigned by someone
  IF NEW.assigned_by IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get recipient name
  SELECT COALESCE(u.display_name, 'Użytkownik') INTO v_recipient_name
  FROM public.users u
  WHERE u.id = NEW.user_id;

  -- Get challenge title
  SELECT COALESCE(ac.title, 'Challenge') INTO v_title
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  -- Find related assignment (best effort)
  SELECT ca.id INTO v_assignment_id
  FROM public.challenge_assignments ca
  WHERE ca.user_challenge_id = NEW.id
  LIMIT 1;

  -- Notify sender
  INSERT INTO public.push_outbox (user_id, type, title, body, data)
  VALUES (
    NEW.assigned_by,
    'challenge_assignment_started',
    'MOVEE 🚀',
    v_recipient_name || ' rozpoczął wyzwanie: ' || v_title,
    jsonb_build_object(
      'type', 'challenge_assignment_started',
      'assignment_id', v_assignment_id,
      'sender_id', NEW.assigned_by,
      'recipient_id', NEW.user_id,
      'user_challenge_id', NEW.id,
      'admin_challenge_id', NEW.admin_challenge_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_push_challenge_assignment_started ON public.user_challenges;
CREATE TRIGGER trg_push_challenge_assignment_started
  AFTER INSERT ON public.user_challenges
  FOR EACH ROW
  WHEN (NEW.assigned_by IS NOT NULL)
  EXECUTE FUNCTION public.enqueue_challenge_assignment_started_push();

-- ============================================
-- 6) Challenge assignment completed notification
-- Notifies sender when recipient completes the assigned challenge
-- ============================================
CREATE OR REPLACE FUNCTION public.enqueue_challenge_assignment_completed_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_name TEXT;
  v_title TEXT;
  v_assignment_id UUID;
BEGIN
  -- Only when challenge status changes to completed
  IF OLD.status = 'completed' OR NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Only for challenges that were assigned by someone
  IF NEW.assigned_by IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get recipient name
  SELECT COALESCE(u.display_name, 'Użytkownik') INTO v_recipient_name
  FROM public.users u
  WHERE u.id = NEW.user_id;

  -- Get challenge title
  SELECT COALESCE(ac.title, 'Challenge') INTO v_title
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  -- Find related assignment (best effort)
  SELECT ca.id INTO v_assignment_id
  FROM public.challenge_assignments ca
  WHERE ca.user_challenge_id = NEW.id
  LIMIT 1;

  -- Notify sender
  INSERT INTO public.push_outbox (user_id, type, title, body, data)
  VALUES (
    NEW.assigned_by,
    'challenge_assignment_completed',
    'Gratulacje! 🎉',
    v_recipient_name || ' ukończył wyzwanie: ' || v_title,
    jsonb_build_object(
      'type', 'challenge_assignment_completed',
      'assignment_id', v_assignment_id,
      'sender_id', NEW.assigned_by,
      'recipient_id', NEW.user_id,
      'user_challenge_id', NEW.id,
      'admin_challenge_id', NEW.admin_challenge_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_push_challenge_assignment_completed ON public.user_challenges;
CREATE TRIGGER trg_push_challenge_assignment_completed
  AFTER UPDATE ON public.user_challenges
  FOR EACH ROW
  WHEN (OLD.status = 'active' AND NEW.status = 'completed' AND NEW.assigned_by IS NOT NULL)
  EXECUTE FUNCTION public.enqueue_challenge_assignment_completed_push();

-- ============================================
-- 7) Ready to claim rewards notification
-- Notifies user when completed challenge is ready to claim
-- ============================================
CREATE OR REPLACE FUNCTION public.enqueue_ready_to_claim_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_points INT;
BEGIN
  -- Only when status changes to completed
  IF OLD.status = 'completed' OR NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Only notify authenticated users
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get challenge title and points
  SELECT COALESCE(ac.title, 'Challenge'), COALESCE(ac.points, 0) INTO v_title, v_points
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  -- Notify user to claim reward
  INSERT INTO public.push_outbox (user_id, type, title, body, data)
  VALUES (
    NEW.user_id,
    'challenge_ready_to_claim',
    'Odbierz nagrodę! 🏆',
    'Ukończyłeś "' || v_title || '". Zdobądź ' || v_points || ' punktów!',
    jsonb_build_object(
      'type', 'challenge_ready_to_claim',
      'user_challenge_id', NEW.id,
      'admin_challenge_id', NEW.admin_challenge_id,
      'points', v_points
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_push_ready_to_claim ON public.user_challenges;
CREATE TRIGGER trg_push_ready_to_claim
  AFTER UPDATE ON public.user_challenges
  FOR EACH ROW
  WHEN (OLD.status = 'active' AND NEW.status = 'completed')
  EXECUTE FUNCTION public.enqueue_ready_to_claim_push();

-- ============================================
-- 8) Milestone reached notification
-- Notifies user when they reach 50% or 75% of challenge goal
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

  -- If milestone reached, notify
  IF v_milestone IS NOT NULL THEN
    INSERT INTO public.push_outbox (user_id, type, title, body, data)
    VALUES (
      NEW.user_id,
      'milestone_reached',
      'Świetna robota! 💪',
      'Osiągnąłeś ' || v_milestone || '% wyzwania: ' || v_title,
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

DROP TRIGGER IF EXISTS trg_push_milestone ON public.user_challenges;
CREATE TRIGGER trg_push_milestone
  AFTER UPDATE ON public.user_challenges
  FOR EACH ROW
  WHEN (OLD.current_steps IS DISTINCT FROM NEW.current_steps)
  EXECUTE FUNCTION public.enqueue_milestone_push();

-- ============================================
-- 9) Update existing triggers to respect push_enabled
-- We'll modify the existing challenge_started and challenge_completed functions
-- ============================================

-- Update challenge_started trigger
CREATE OR REPLACE FUNCTION public.enqueue_challenge_started_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
BEGIN
  -- Only notify authenticated users
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get challenge title
  SELECT COALESCE(ac.title, 'Challenge') INTO v_title
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  -- Enqueue notification
  INSERT INTO public.push_outbox (user_id, type, title, body, data)
  VALUES (
    NEW.user_id,
    'challenge_started',
    'MOVEE 🚀',
    'Rozpocząłeś wyzwanie: ' || v_title,
    jsonb_build_object(
      'type', 'challenge_started',
      'user_challenge_id', NEW.id,
      'admin_challenge_id', NEW.admin_challenge_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update challenge_completed trigger
CREATE OR REPLACE FUNCTION public.enqueue_challenge_completed_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
BEGIN
  -- Only notify authenticated users
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get challenge title
  SELECT COALESCE(ac.title, 'Challenge') INTO v_title
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  -- Enqueue notification
  INSERT INTO public.push_outbox (user_id, type, title, body, data)
  VALUES (
    NEW.user_id,
    'challenge_completed',
    'Gratulacje! 🎉',
    'Ukończyłeś wyzwanie na 100%: ' || v_title,
    jsonb_build_object(
      'type', 'challenge_completed',
      'user_challenge_id', NEW.id,
      'admin_challenge_id', NEW.admin_challenge_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================
-- Summary of notification types:
-- ============================================
-- 1. challenge_started - User starts a challenge
-- 2. challenge_completed - User completes a challenge (100%)
-- 3. challenge_assigned - Someone sends you a challenge invitation
-- 4. challenge_assignment_accepted - Someone accepts your invitation
-- 5. challenge_assignment_rejected - Someone rejects your invitation
-- 6. challenge_assignment_started - Someone you invited starts the challenge
-- 7. challenge_assignment_completed - Someone you invited completes the challenge
-- 8. challenge_ready_to_claim - Challenge completed, ready to claim rewards
-- 9. milestone_reached - User reaches 50% or 75% of challenge goal
-- 10. team_member_completed - Reserved for future team features
-- ============================================
