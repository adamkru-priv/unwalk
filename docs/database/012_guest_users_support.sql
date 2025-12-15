-- ============================================
-- UNWALK: Guest Users Support
-- Migration 012
-- Add support for Guest users in database
-- ============================================

-- Add columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS device_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false;

-- Index for device_id lookup
CREATE INDEX IF NOT EXISTS idx_users_device_id ON public.users(device_id);
CREATE INDEX IF NOT EXISTS idx_users_is_guest ON public.users(is_guest);

-- Make email nullable for guests
ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;

-- Update unique constraint on email (allow null for guests)
DROP INDEX IF EXISTS users_email_key;
CREATE UNIQUE INDEX users_email_key ON public.users(email) WHERE email IS NOT NULL;

-- ============================================
-- FUNCTION: Create guest user
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
  -- Check if guest already exists
  SELECT id INTO v_user_id
  FROM public.users
  WHERE device_id = p_device_id;
  
  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;
  
  -- Generate Guest display name from device_id (last 4 chars)
  v_suffix := SUBSTRING(p_device_id FROM LENGTH(p_device_id) - 3);
  v_display_name := 'Guest_' || v_suffix;
  
  -- Create new guest user (bypass auth.users - guest only in public.users)
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
    NULL, -- No email for guest
    'basic',
    true,
    false
  );
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Convert guest to logged user
-- Called after successful sign up/sign in
-- ============================================
CREATE OR REPLACE FUNCTION public.convert_guest_to_user(
  p_device_id TEXT,
  p_auth_user_id UUID,
  p_email TEXT
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_id UUID;
BEGIN
  -- Find guest user by device_id
  SELECT id INTO v_guest_id
  FROM public.users
  WHERE device_id = p_device_id
    AND is_guest = true;
  
  IF v_guest_id IS NULL THEN
    -- No guest found, nothing to migrate
    RETURN;
  END IF;
  
  -- Update all user_challenges to point to new auth user
  UPDATE user_challenges
  SET user_id = p_auth_user_id
  WHERE user_id = v_guest_id;
  
  -- Update team_members relationships
  UPDATE team_members
  SET user_id = p_auth_user_id
  WHERE user_id = v_guest_id;
  
  UPDATE team_members
  SET member_id = p_auth_user_id
  WHERE member_id = v_guest_id;
  
  -- Update challenge assignments
  UPDATE challenge_assignments
  SET sender_id = p_auth_user_id
  WHERE sender_id = v_guest_id;
  
  UPDATE challenge_assignments
  SET recipient_id = p_auth_user_id
  WHERE recipient_id = v_guest_id;
  
  -- Delete old guest user (or mark as migrated)
  DELETE FROM public.users WHERE id = v_guest_id;
  
  -- Note: New logged user is already created by handle_new_user trigger
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- UPDATE RLS POLICIES for guest access
-- ============================================

-- users: Guests can read their own profile
DROP POLICY IF EXISTS "Anyone can view user profiles" ON public.users;
CREATE POLICY "Anyone can view user profiles"
  ON public.users FOR SELECT
  USING (true);

-- users: Guests can update their own profile (by device_id or auth)
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (
    auth.uid() = id -- Logged users
    OR device_id IN (SELECT device_id FROM public.users WHERE id = auth.uid()) -- Guest matching
  );

-- user_challenges: Allow guest users (not authenticated)
DROP POLICY IF EXISTS "Users can view their own challenges" ON user_challenges;
CREATE POLICY "Users can view their own challenges"
  ON user_challenges FOR SELECT
  USING (
    auth.uid() = user_id -- Logged users
    OR device_id IS NOT NULL -- Backwards compatibility
    OR user_id IN (SELECT id FROM public.users WHERE is_guest = true) -- Guest access
  );

DROP POLICY IF EXISTS "Users can update their own challenges" ON user_challenges;
CREATE POLICY "Users can update their own challenges"
  ON user_challenges FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR device_id IS NOT NULL
    OR user_id IN (SELECT id FROM public.users WHERE is_guest = true)
  );

DROP POLICY IF EXISTS "Users can create their own challenges" ON user_challenges;
CREATE POLICY "Users can create their own challenges"
  ON user_challenges FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    OR device_id IS NOT NULL
    OR user_id IN (SELECT id FROM public.users WHERE is_guest = true)
  );

-- ============================================
-- CLEANUP: Remove old inactive guests (optional)
-- Run periodically to clean up abandoned devices
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_inactive_guests(days_inactive INTEGER DEFAULT 30)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete guests with no activity in X days
  WITH deleted AS (
    DELETE FROM public.users
    WHERE is_guest = true
      AND updated_at < NOW() - (days_inactive || ' days')::INTERVAL
      AND NOT EXISTS (
        SELECT 1 FROM user_challenges
        WHERE user_id = public.users.id
          AND status = 'active'
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON COLUMN public.users.device_id IS 'Unique device identifier for guest users';
COMMENT ON COLUMN public.users.is_guest IS 'True if user is a guest (no auth account)';
COMMENT ON FUNCTION public.create_guest_user IS 'Creates a guest user record for analytics and tracking';
COMMENT ON FUNCTION public.convert_guest_to_user IS 'Migrates guest data to logged user after signup';
COMMENT ON FUNCTION cleanup_inactive_guests IS 'Removes inactive guest users (run periodically)';
