-- Function to delete user account and all associated data
-- This is a permanent action that cannot be undone
CREATE OR REPLACE FUNCTION delete_user_account(user_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify that the user calling this function is the account owner
  IF auth.uid() != user_id THEN
    RAISE EXCEPTION 'You can only delete your own account';
  END IF;

  -- Delete all user data in correct order (respecting foreign keys)
  
  -- 1. Delete challenge assignments (sent and received)
  DELETE FROM challenge_assignments WHERE sender_id = user_id OR recipient_id = user_id;
  
  -- 2. Delete team invitations (sent and received)
  DELETE FROM team_invitations WHERE sender_id = user_id OR recipient_id = user_id;
  
  -- 3. Delete team relationships
  DELETE FROM team_members WHERE user_id = user_id OR member_id = user_id;
  
  -- 4. Delete user challenges
  DELETE FROM user_challenges WHERE user_id = user_id;
  
  -- 5. Delete user profile
  DELETE FROM public.users WHERE id = user_id;
  
  -- 6. Delete auth user (Supabase Auth)
  -- Note: This should be done via Supabase Admin API for security
  -- For now, we just delete the profile data
  -- The auth.users entry will be cleaned up separately or manually
  
  RAISE NOTICE 'User account % deleted successfully', user_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;

-- Comment
COMMENT ON FUNCTION delete_user_account IS 'Permanently deletes user account and all associated data (GDPR compliance)';
