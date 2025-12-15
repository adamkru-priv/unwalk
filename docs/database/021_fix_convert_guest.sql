-- Fix convert_guest_to_user function
-- Instead of deleting guest, UPDATE it to become authenticated user
-- FIX: Update display_name to use email instead of keeping "Guest_xxx"

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
  v_existing_user UUID;
BEGIN
  -- Find guest user by device_id
  SELECT id INTO v_guest_id
  FROM public.users
  WHERE device_id = p_device_id
    AND is_guest = true;
  
  IF v_guest_id IS NULL THEN
    -- No guest found - check if auth user already has profile
    SELECT id INTO v_existing_user
    FROM public.users
    WHERE id = p_auth_user_id;
    
    -- If auth user doesn't have profile, create one
    IF v_existing_user IS NULL THEN
      INSERT INTO public.users (id, email, display_name, is_guest)
      VALUES (p_auth_user_id, p_email, p_email, false);
    END IF;
    
    RETURN;
  END IF;
  
  -- Check if auth user already exists in users table
  SELECT id INTO v_existing_user
  FROM public.users
  WHERE id = p_auth_user_id;
  
  IF v_existing_user IS NOT NULL THEN
    -- Auth user already has profile - migrate guest data and delete guest
    
    -- Update all user_challenges to point to auth user
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
    
    -- Migrate user_badges (skip duplicates)
    INSERT INTO user_badges (user_id, achievement_id, unlocked_at, created_at)
    SELECT p_auth_user_id, achievement_id, unlocked_at, created_at
    FROM user_badges
    WHERE user_id = v_guest_id
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
    
    -- Delete old guest badges
    DELETE FROM user_badges WHERE user_id = v_guest_id;
    
    -- Delete old guest user
    DELETE FROM public.users WHERE id = v_guest_id;
  ELSE
    -- Auth user doesn't have profile yet - convert guest record to authenticated user
    -- This is the most common case for OTP login
    -- FIX: Set display_name to email (not keep Guest_xxx)
    
    UPDATE public.users
    SET 
      id = p_auth_user_id,
      email = p_email,
      display_name = p_email,
      is_guest = false,
      device_id = NULL,
      updated_at = NOW()
    WHERE id = v_guest_id;
    
    -- Update all relations to use new user_id
    UPDATE user_challenges SET user_id = p_auth_user_id WHERE user_id = v_guest_id;
    UPDATE team_members SET user_id = p_auth_user_id WHERE user_id = v_guest_id;
    UPDATE team_members SET member_id = p_auth_user_id WHERE member_id = v_guest_id;
    UPDATE challenge_assignments SET sender_id = p_auth_user_id WHERE sender_id = v_guest_id;
    UPDATE challenge_assignments SET recipient_id = p_auth_user_id WHERE recipient_id = v_guest_id;
    UPDATE user_badges SET user_id = p_auth_user_id WHERE user_id = v_guest_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.convert_guest_to_user IS 'Migrates guest user to authenticated user after signup/login';
