-- ============================================
-- MOVEE: Fix create_guest_user() for Guest vs Pro model
-- Migration 040
-- Date: 2025-12-21
--
-- Why:
-- - The app model is now Guest vs Pro only.
-- - users.tier is constrained to 'pro' (see 039_guest_pro_simplification).
-- - Older versions of create_guest_user inserted tier='basic', causing errors
--   and onboarding to freeze after sign-out.
-- ============================================

CREATE OR REPLACE FUNCTION public.create_guest_user(p_device_id TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_display_name TEXT;
  v_suffix TEXT;
BEGIN
  -- Reuse existing guest for this device_id if present
  SELECT id INTO v_user_id
  FROM public.users
  WHERE device_id = p_device_id;

  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;

  -- Generate Guest display name from device_id (last 4 chars)
  v_suffix := SUBSTRING(p_device_id FROM GREATEST(LENGTH(p_device_id) - 3, 1));
  v_display_name := 'Guest_' || v_suffix;

  -- Create new guest user
  v_user_id := gen_random_uuid();

  INSERT INTO public.users (
    id,
    device_id,
    display_name,
    email,
    tier,
    is_guest,
    onboarding_completed
  ) VALUES (
    v_user_id,
    p_device_id,
    v_display_name,
    NULL,
    'pro',
    true,
    false
  );

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- Optional: backfill any existing guests that might still have tier != 'pro'
UPDATE public.users
SET tier = 'pro'
WHERE is_guest = true
  AND tier IS DISTINCT FROM 'pro';
