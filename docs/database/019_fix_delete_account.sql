-- Fix delete_user_account function - rename parameter to avoid ambiguity
DROP FUNCTION IF EXISTS delete_user_account(UUID);

CREATE OR REPLACE FUNCTION delete_user_account(p_user_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify that the user calling this function is the account owner
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'You can only delete your own account';
  END IF;

  -- Delete all user data in correct order (respecting foreign keys)
  
  -- 1. Delete challenge assignments (sent and received)
  DELETE FROM challenge_assignments WHERE sender_id = p_user_id OR recipient_id = p_user_id;
  
  -- 2. Delete team invitations (sent and received)
  DELETE FROM team_invitations WHERE sender_id = p_user_id OR recipient_id = p_user_id;
  
  -- 3. Delete team relationships
  DELETE FROM team_members WHERE user_id = p_user_id OR member_id = p_user_id;
  
  -- 4. Delete user challenges
  DELETE FROM user_challenges WHERE user_id = p_user_id;
  
  -- 5. Delete user profile
  DELETE FROM public.users WHERE id = p_user_id;
  
  RAISE NOTICE 'User account % deleted successfully', p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;

-- Comment
COMMENT ON FUNCTION delete_user_account IS 'Permanently deletes user account and all associated data (GDPR compliance)';
