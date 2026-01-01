-- ============================================
-- FIX: Clean push notification system
-- Remove spam (milestone 50%/75%), remove duplicates, add team_invitation
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

-- 4. Add team_invitation notification
CREATE OR REPLACE FUNCTION public.enqueue_team_invitation_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name TEXT;
  v_push_enabled BOOLEAN;
BEGIN
  -- Only for real users with recipient_id
  IF NEW.recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if recipient has push enabled
  SELECT COALESCE(u.push_enabled, true) INTO v_push_enabled
  FROM public.users u
  WHERE u.id = NEW.recipient_id;

  IF NOT v_push_enabled THEN
    RETURN NEW;
  END IF;

  -- Get sender name
  SELECT COALESCE(u.display_name, u.email, 'Ktoś') INTO v_sender_name
  FROM public.users u
  WHERE u.id = NEW.sender_id;

  -- Enqueue notification
  INSERT INTO public.push_outbox (user_id, type, title, body, data)
  VALUES (
    NEW.recipient_id,
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_push_team_invitation ON public.team_invitations;
CREATE TRIGGER trg_push_team_invitation
  AFTER INSERT ON public.team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_team_invitation_push();

-- 5. Update all existing functions to check push_enabled

-- Challenge started
CREATE OR REPLACE FUNCTION public.enqueue_challenge_started_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_push_enabled BOOLEAN;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check push_enabled
  SELECT COALESCE(u.push_enabled, true) INTO v_push_enabled
  FROM public.users u
  WHERE u.id = NEW.user_id;

  IF NOT v_push_enabled THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(ac.title, 'Challenge') INTO v_title
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

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

-- Challenge completed
CREATE OR REPLACE FUNCTION public.enqueue_challenge_completed_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_push_enabled BOOLEAN;
  v_points INT;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check push_enabled
  SELECT COALESCE(u.push_enabled, true) INTO v_push_enabled
  FROM public.users u
  WHERE u.id = NEW.user_id;

  IF NOT v_push_enabled THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(ac.title, 'Challenge'), COALESCE(ac.points, 0) INTO v_title, v_points
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  INSERT INTO public.push_outbox (user_id, type, title, body, data)
  VALUES (
    NEW.user_id,
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Challenge assigned
CREATE OR REPLACE FUNCTION public.enqueue_challenge_assigned_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name TEXT;
  v_title TEXT;
  v_push_enabled BOOLEAN;
BEGIN
  -- Check push_enabled
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

-- Challenge assignment status (accepted/rejected)
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
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('accepted', 'rejected') THEN
    RETURN NEW;
  END IF;

  -- Check push_enabled for sender
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

-- Challenge assignment started
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
BEGIN
  IF NEW.assigned_by IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check push_enabled for sender
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

-- Challenge assignment completed
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
BEGIN
  IF OLD.status = 'completed' OR NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  IF NEW.assigned_by IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check push_enabled for sender
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

COMMIT;

-- ============================================
-- FINAL LIST OF PUSH NOTIFICATIONS (8 types, no spam):
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
-- REMOVED (spam/duplicates):
-- - milestone_reached (50%, 75%) - too noisy
-- - challenge_ready_to_claim - duplicate of challenge_completed
-- - team_member_completed - not implemented
-- ============================================
