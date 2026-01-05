-- ============================================
-- FIX: Push notifications - ALL IN ENGLISH with more details
-- 1. Change all Polish text to English
-- 2. Add username info for team notifications
-- 3. Add goal steps and deadline info for challenge_started
-- ============================================

BEGIN;

-- ============================================
-- 1. Team invitation notification
-- ============================================
CREATE OR REPLACE FUNCTION public.enqueue_team_invitation_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name TEXT;
  v_push_enabled BOOLEAN;
  v_platform_record RECORD;
BEGIN
  IF NEW.recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(u.push_enabled, true) INTO v_push_enabled
  FROM public.users u
  WHERE u.id = NEW.recipient_id;

  IF NOT v_push_enabled THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(u.display_name, u.nickname, u.email, 'Someone') INTO v_sender_name
  FROM public.users u
  WHERE u.id = NEW.sender_id;

  FOR v_platform_record IN SELECT * FROM get_user_platforms(NEW.recipient_id)
  LOOP
    INSERT INTO public.push_outbox (user_id, platform, type, title, body, data)
    VALUES (
      NEW.recipient_id,
      v_platform_record.platform,
      'team_invitation_received',
      'New Invitation! 👥',
      v_sender_name || ' invites you to their team',
      jsonb_build_object(
        'type', 'team_invitation_received',
        'invitation_id', NEW.id,
        'sender_id', NEW.sender_id,
        'recipient_id', NEW.recipient_id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. Challenge started - WITH GOAL STEPS AND DEADLINE
-- ============================================
CREATE OR REPLACE FUNCTION public.enqueue_challenge_started_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_goal_steps INT;
  v_time_limit_hours INT;
  v_body TEXT;
  v_platform_record RECORD;
  v_push_enabled BOOLEAN;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(u.push_enabled, true) INTO v_push_enabled
  FROM public.users u
  WHERE u.id = NEW.user_id;

  IF NOT v_push_enabled THEN
    RETURN NEW;
  END IF;

  SELECT 
    COALESCE(ac.title, 'Challenge'),
    ac.goal_steps,
    ac.time_limit_hours
  INTO v_title, v_goal_steps, v_time_limit_hours
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  -- Build body with goal and deadline info
  v_body := 'Challenge started: ' || v_title;
  
  IF v_goal_steps IS NOT NULL THEN
    v_body := v_body || ' • Goal: ' || (v_goal_steps / 1000) || 'k steps';
  END IF;
  
  IF v_time_limit_hours IS NOT NULL THEN
    IF v_time_limit_hours < 24 THEN
      v_body := v_body || ' • ' || v_time_limit_hours || 'h to complete';
    ELSE
      v_body := v_body || ' • ' || (v_time_limit_hours / 24) || 'd to complete';
    END IF;
  END IF;

  FOR v_platform_record IN SELECT * FROM get_user_platforms(NEW.user_id)
  LOOP
    INSERT INTO public.push_outbox (user_id, platform, type, title, body, data)
    VALUES (
      NEW.user_id,
      v_platform_record.platform,
      'challenge_started',
      'MOVEE 🚀',
      v_body,
      jsonb_build_object(
        'type', 'challenge_started',
        'user_challenge_id', NEW.id,
        'admin_challenge_id', NEW.admin_challenge_id,
        'goal_steps', v_goal_steps,
        'time_limit_hours', v_time_limit_hours
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. Challenge completed
-- ============================================
CREATE OR REPLACE FUNCTION public.enqueue_challenge_completed_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_points INT;
  v_platform_record RECORD;
  v_push_enabled BOOLEAN;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(u.push_enabled, true) INTO v_push_enabled
  FROM public.users u
  WHERE u.id = NEW.user_id;

  IF NOT v_push_enabled THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(ac.title, 'Challenge'), COALESCE(ac.points, 0) INTO v_title, v_points
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  FOR v_platform_record IN SELECT * FROM get_user_platforms(NEW.user_id)
  LOOP
    INSERT INTO public.push_outbox (user_id, platform, type, title, body, data)
    VALUES (
      NEW.user_id,
      v_platform_record.platform,
      'challenge_completed',
      'Congratulations! 🎉',
      'You completed "' || v_title || '"! Claim ' || v_points || ' XP!',
      jsonb_build_object(
        'type', 'challenge_completed',
        'user_challenge_id', NEW.id,
        'admin_challenge_id', NEW.admin_challenge_id,
        'points', v_points
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. Challenge assigned
-- ============================================
CREATE OR REPLACE FUNCTION public.enqueue_challenge_assigned_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name TEXT;
  v_title TEXT;
  v_push_enabled BOOLEAN;
  v_platform_record RECORD;
BEGIN
  SELECT COALESCE(u.push_enabled, true) INTO v_push_enabled
  FROM public.users u
  WHERE u.id = NEW.recipient_id;

  IF NOT v_push_enabled THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(u.display_name, u.nickname, 'Someone') INTO v_sender_name
  FROM public.users u
  WHERE u.id = NEW.sender_id;

  SELECT COALESCE(ac.title, 'Challenge') INTO v_title
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  FOR v_platform_record IN SELECT * FROM get_user_platforms(NEW.recipient_id)
  LOOP
    INSERT INTO public.push_outbox (user_id, platform, type, title, body, data)
    VALUES (
      NEW.recipient_id,
      v_platform_record.platform,
      'challenge_assigned',
      'New Challenge! 🎯',
      v_sender_name || ' sent you a challenge: ' || v_title,
      jsonb_build_object(
        'type', 'challenge_assigned',
        'assignment_id', NEW.id,
        'sender_id', NEW.sender_id,
        'recipient_id', NEW.recipient_id,
        'admin_challenge_id', NEW.admin_challenge_id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. Challenge assignment status (accepted/rejected)
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
  v_push_enabled BOOLEAN;
  v_platform_record RECORD;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('accepted', 'rejected') THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(u.push_enabled, true) INTO v_push_enabled
  FROM public.users u
  WHERE u.id = NEW.sender_id;

  IF NOT v_push_enabled THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(u.display_name, u.nickname, 'User') INTO v_recipient_name
  FROM public.users u
  WHERE u.id = NEW.recipient_id;

  SELECT COALESCE(ac.title, 'Challenge') INTO v_title
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  IF NEW.status = 'accepted' THEN
    v_type := 'challenge_assignment_accepted';
    v_emoji := '✅';
    v_body := v_recipient_name || ' accepted the challenge: ' || v_title;
  ELSE
    v_type := 'challenge_assignment_rejected';
    v_emoji := '❌';
    v_body := v_recipient_name || ' declined the challenge: ' || v_title;
  END IF;

  FOR v_platform_record IN SELECT * FROM get_user_platforms(NEW.sender_id)
  LOOP
    INSERT INTO public.push_outbox (user_id, platform, type, title, body, data)
    VALUES (
      NEW.sender_id,
      v_platform_record.platform,
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
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. Challenge assignment started - WITH USERNAME
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
  v_push_enabled BOOLEAN;
  v_platform_record RECORD;
BEGIN
  IF NEW.assigned_by IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(u.push_enabled, true) INTO v_push_enabled
  FROM public.users u
  WHERE u.id = NEW.assigned_by;

  IF NOT v_push_enabled THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(u.display_name, u.nickname, 'User') INTO v_recipient_name
  FROM public.users u
  WHERE u.id = NEW.user_id;

  SELECT COALESCE(ac.title, 'Challenge') INTO v_title
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  SELECT ca.id INTO v_assignment_id
  FROM public.challenge_assignments ca
  WHERE ca.user_challenge_id = NEW.id
  LIMIT 1;

  FOR v_platform_record IN SELECT * FROM get_user_platforms(NEW.assigned_by)
  LOOP
    INSERT INTO public.push_outbox (user_id, platform, type, title, body, data)
    VALUES (
      NEW.assigned_by,
      v_platform_record.platform,
      'challenge_assignment_started',
      'MOVEE 🚀',
      v_recipient_name || ' started the challenge: ' || v_title,
      jsonb_build_object(
        'type', 'challenge_assignment_started',
        'assignment_id', v_assignment_id,
        'sender_id', NEW.assigned_by,
        'recipient_id', NEW.user_id,
        'user_challenge_id', NEW.id,
        'admin_challenge_id', NEW.admin_challenge_id,
        'recipient_name', v_recipient_name
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. Challenge assignment completed - WITH USERNAME
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
  v_push_enabled BOOLEAN;
  v_platform_record RECORD;
BEGIN
  IF OLD.status = 'completed' OR NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  IF NEW.assigned_by IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(u.push_enabled, true) INTO v_push_enabled
  FROM public.users u
  WHERE u.id = NEW.assigned_by;

  IF NOT v_push_enabled THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(u.display_name, u.nickname, 'User') INTO v_recipient_name
  FROM public.users u
  WHERE u.id = NEW.user_id;

  SELECT COALESCE(ac.title, 'Challenge') INTO v_title
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  SELECT ca.id INTO v_assignment_id
  FROM public.challenge_assignments ca
  WHERE ca.user_challenge_id = NEW.id
  LIMIT 1;

  FOR v_platform_record IN SELECT * FROM get_user_platforms(NEW.assigned_by)
  LOOP
    INSERT INTO public.push_outbox (user_id, platform, type, title, body, data)
    VALUES (
      NEW.assigned_by,
      v_platform_record.platform,
      'challenge_assignment_completed',
      'Congratulations! 🎉',
      v_recipient_name || ' completed the challenge: ' || v_title,
      jsonb_build_object(
        'type', 'challenge_assignment_completed',
        'assignment_id', v_assignment_id,
        'sender_id', NEW.assigned_by,
        'recipient_id', NEW.user_id,
        'user_challenge_id', NEW.id,
        'admin_challenge_id', NEW.admin_challenge_id,
        'recipient_name', v_recipient_name
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================
-- SUMMARY OF CHANGES:
-- ============================================
-- ✅ All text changed from Polish to English
-- ✅ Added username info for team notifications (challenge_assignment_started, challenge_assignment_completed)
-- ✅ Added goal_steps and time_limit info for challenge_started notification
-- ✅ Used display_name, nickname fallback for better user identification
-- ============================================
