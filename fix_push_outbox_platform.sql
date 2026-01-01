-- ============================================
-- FIX: push_outbox platform detection
-- Problem: All notifications hardcoded to platform='ios'
-- Solution: Detect user's platforms from device_push_tokens and create separate notifications
-- ============================================

BEGIN;

-- 1. Update push_outbox constraint to allow both platforms
ALTER TABLE public.push_outbox
  DROP CONSTRAINT IF EXISTS push_outbox_platform_check;

ALTER TABLE public.push_outbox
  ADD CONSTRAINT push_outbox_platform_check
  CHECK (platform IN ('ios', 'android'));

-- 2. Update challenge_started trigger to detect platform
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

  -- Insert one notification per registered device/platform
  FOR v_platform_record IN
    SELECT DISTINCT platform
    FROM device_push_tokens
    WHERE user_id = NEW.user_id
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

-- 3. Update challenge_completed trigger to detect platform
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

  -- Insert one notification per registered device/platform
  FOR v_platform_record IN
    SELECT DISTINCT platform
    FROM device_push_tokens
    WHERE user_id = NEW.user_id
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

COMMIT;

-- ============================================
-- Verify the fix
-- ============================================
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.push_outbox'::regclass
  AND conname = 'push_outbox_platform_check';
