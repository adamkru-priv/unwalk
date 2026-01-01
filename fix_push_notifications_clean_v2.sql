-- ============================================
-- FIX: Clean push notification system with platform detection
-- Remove spam (milestone 50%/75%), remove duplicates, add team_invitation
-- AUTO-DETECT platform from device_push_tokens for each user
-- ============================================

BEGIN;

-- 1. Drop unnecessary triggers
DROP TRIGGER IF EXISTS trg_push_milestone ON public.user_challenges;
DROP TRIGGER IF EXISTS trg_push_ready_to_claim ON public.user_challenges;

-- 2. Drop unnecessary functions
DROP FUNCTION IF EXISTS public.enqueue_milestone_push();
DROP FUNCTION IF EXISTS public.enqueue_ready_to_claim_push();

-- 3. Update type constraint - remove spam types, add team_invitation
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
    'team_invitation_received'
  ));

-- ============================================
-- Helper function to get user platforms
-- ============================================
CREATE OR REPLACE FUNCTION get_user_platforms(p_user_id UUID)
RETURNS TABLE(platform TEXT)
LANGUAGE SQL
STABLE
AS $$
  SELECT DISTINCT dpt.platform
  FROM device_push_tokens dpt
  WHERE dpt.user_id = p_user_id;
$$;

-- ============================================
-- 4. Team invitation notification
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

  SELECT COALESCE(u.display_name, u.email, 'Ktoś') INTO v_sender_name
  FROM public.users u
  WHERE u.id = NEW.sender_id;

  FOR v_platform_record IN SELECT * FROM get_user_platforms(NEW.recipient_id)
  LOOP
    INSERT INTO public.push_outbox (user_id, platform, type, title, body, data)
    VALUES (
      NEW.recipient_id,
      v_platform_record.platform,
      'team_invitation_received',
      'Nowe zaproszenie! 👥',
      v_sender_name || ' zaprasza Cię do swojego teamu',
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

DROP TRIGGER IF EXISTS trg_push_team_invitation ON public.team_invitations;
CREATE TRIGGER trg_push_team_invitation
  AFTER INSERT ON public.team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_team_invitation_push();

-- ============================================
-- 5. Challenge started (already updated in previous migration)
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
      'Rozpocząłeś wyzwanie: ' || v_title,
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
-- 6. Challenge completed
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
      'Gratulacje! 🎉',
      'Ukończyłeś "' || v_title || '"! Odbierz ' || v_points || ' punktów!',
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
-- 7. Challenge assigned
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

  SELECT COALESCE(u.display_name, 'Ktoś') INTO v_sender_name
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
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. Challenge assignment status (accepted/rejected)
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

  SELECT COALESCE(u.display_name, 'Użytkownik') INTO v_recipient_name
  FROM public.users u
  WHERE u.id = NEW.recipient_id;

  SELECT COALESCE(ac.title, 'Challenge') INTO v_title
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  IF NEW.status = 'accepted' THEN
    v_type := 'challenge_assignment_accepted';
    v_emoji := '✅';
    v_body := v_recipient_name || ' zaakceptował wyzwanie: ' || v_title;
  ELSE
    v_type := 'challenge_assignment_rejected';
    v_emoji := '❌';
    v_body := v_recipient_name || ' odrzucił wyzwanie: ' || v_title;
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
-- 9. Challenge assignment started
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

  SELECT COALESCE(u.display_name, 'Użytkownik') INTO v_recipient_name
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
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. Challenge assignment completed
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

  SELECT COALESCE(u.display_name, 'Użytkownik') INTO v_recipient_name
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
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================
-- FINAL LIST OF PUSH NOTIFICATIONS (8 types, with auto platform detection):
-- ============================================
-- 1. team_invitation_received - Someone invites you to their team
-- 2. challenge_started - You start a challenge
-- 3. challenge_completed - You complete a challenge (100%) - includes points to claim
-- 4. challenge_assigned - Someone sends you a challenge invitation
-- 5. challenge_assignment_accepted - Someone accepts your challenge invitation
-- 6. challenge_assignment_rejected - Someone rejects your challenge invitation
-- 7. challenge_assignment_started - Someone you invited starts the challenge
-- 8. challenge_assignment_completed - Someone you invited completes the challenge
-- ============================================
-- Each notification automatically creates entries for ALL user's platforms (iOS + Android)
-- ============================================
