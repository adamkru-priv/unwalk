-- ============================================
-- FIX: Change ALL push notifications to English
-- ============================================

BEGIN;

-- ============================================
-- 1. Team invitation notification - ENGLISH
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

  SELECT COALESCE(u.display_name, u.email, 'Someone') INTO v_sender_name
  FROM public.users u
  WHERE u.id = NEW.sender_id;

  FOR v_platform_record IN SELECT * FROM get_user_platforms(NEW.recipient_id)
  LOOP
    INSERT INTO public.push_outbox (user_id, platform, type, title, body, data)
    VALUES (
      NEW.recipient_id,
      v_platform_record.platform,
      'team_invitation_received',
      'Team Invite! 👥',
      v_sender_name || ' invited you to their team',
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
-- 2. Challenge started - ENGLISH
-- ============================================
CREATE OR REPLACE FUNCTION public.enqueue_challenge_started_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
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

  SELECT COALESCE(ac.title, 'Challenge') INTO v_title
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  FOR v_platform_record IN SELECT * FROM get_user_platforms(NEW.user_id)
  LOOP
    INSERT INTO public.push_outbox (user_id, platform, type, title, body, data)
    VALUES (
      NEW.user_id,
      v_platform_record.platform,
      'challenge_started',
      'MOVEE 🚀',
      'You started: ' || v_title,
      jsonb_build_object(
        'type', 'challenge_started',
        'user_challenge_id', NEW.id,
        'admin_challenge_id', NEW.admin_challenge_id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. Challenge completed - ENGLISH
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
      'You completed: ' || v_title || ' (' || (NEW.current_steps)::TEXT || ' steps)',
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
-- 4. Challenge assigned - ENGLISH
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

  SELECT COALESCE(u.display_name, 'Someone') INTO v_sender_name
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
      v_sender_name || ' sent you: ' || v_title,
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
-- 5. Challenge assignment accepted - ENGLISH
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

  SELECT COALESCE(u.display_name, 'User') INTO v_recipient_name
  FROM public.users u
  WHERE u.id = NEW.recipient_id;

  SELECT COALESCE(ac.title, 'Challenge') INTO v_title
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  IF NEW.status = 'accepted' THEN
    v_type := 'challenge_assignment_accepted';
    v_emoji := '✅';
    v_body := v_recipient_name || ' accepted: ' || v_title;
  ELSE
    v_type := 'challenge_assignment_rejected';
    v_emoji := '❌';
    v_body := v_recipient_name || ' declined: ' || v_title;
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
-- 6. Challenge assignment started - ENGLISH
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

  SELECT COALESCE(u.display_name, 'User') INTO v_recipient_name
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
      v_recipient_name || ' started: ' || v_title,
      jsonb_build_object(
        'type', 'challenge_assignment_started',
        'assignment_id', v_assignment_id,
        'sender_id', NEW.assigned_by,
        'recipient_id', NEW.user_id,
        'user_challenge_id', NEW.id,
        'admin_challenge_id', NEW.admin_challenge_id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. Challenge assignment completed - ENGLISH
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

  SELECT COALESCE(u.display_name, 'User') INTO v_recipient_name
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
      v_recipient_name || ' completed: ' || v_title,
      jsonb_build_object(
        'type', 'challenge_assignment_completed',
        'assignment_id', v_assignment_id,
        'sender_id', NEW.assigned_by,
        'recipient_id', NEW.user_id,
        'user_challenge_id', NEW.id,
        'admin_challenge_id', NEW.admin_challenge_id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================
-- ALL NOTIFICATIONS NOW IN ENGLISH:
-- ============================================
-- 1. Team Invite! �� - "X invited you to their team"
-- 2. MOVEE 🚀 - "You started: X"
-- 3. Congratulations! 🎉 - "You completed: X (3500 steps)"
-- 4. New Challenge! �� - "X sent you: Y"
-- 5. MOVEE ✅ - "X accepted: Y"
-- 6. MOVEE ❌ - "X declined: Y"
-- 7. MOVEE 🚀 - "X started: Y"
-- 8. Congratulations! 🎉 - "X completed: Y"
-- ============================================
