-- Fix accept_team_invitation - improve security and RLS handling
CREATE OR REPLACE FUNCTION accept_team_invitation(invitation_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id UUID;
  v_recipient_id UUID;
  v_recipient_email TEXT;
  v_current_user_email TEXT;
  v_current_user_id UUID;
BEGIN
  -- Get current user info
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get current user's email
  SELECT email INTO v_current_user_email
  FROM public.users
  WHERE id = v_current_user_id;
  
  -- Get invitation details (bypass RLS with SECURITY DEFINER)
  SELECT sender_id, recipient_id, recipient_email
  INTO v_sender_id, v_recipient_id, v_recipient_email
  FROM team_invitations
  WHERE id = invitation_id
    AND status = 'pending'
    AND expires_at > NOW()
    AND (
      recipient_id = v_current_user_id 
      OR recipient_email = v_current_user_email
    );
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;
  
  -- If recipient_id is NULL, update it now
  IF v_recipient_id IS NULL THEN
    v_recipient_id := v_current_user_id;
    
    UPDATE team_invitations
    SET recipient_id = v_recipient_id
    WHERE id = invitation_id;
  END IF;
  
  -- Update invitation status
  UPDATE team_invitations
  SET status = 'accepted',
      responded_at = NOW()
  WHERE id = invitation_id;
  
  -- Create bidirectional team relationship
  INSERT INTO team_members (user_id, member_id)
  VALUES 
    (v_sender_id, v_recipient_id),
    (v_recipient_id, v_sender_id)
  ON CONFLICT (user_id, member_id) DO NOTHING;
  
  RAISE NOTICE 'Team invitation % accepted by user %', invitation_id, v_current_user_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION accept_team_invitation(UUID) TO authenticated;

COMMENT ON FUNCTION accept_team_invitation IS 'Accept team invitation and create bidirectional team relationship';
