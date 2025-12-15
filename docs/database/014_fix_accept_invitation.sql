-- Fix accept_team_invitation to work with email-based invitations
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
BEGIN
  -- Get current user's email
  SELECT email INTO v_current_user_email
  FROM public.users
  WHERE id = auth.uid();
  
  -- Get invitation details (check both recipient_id and email)
  SELECT sender_id, recipient_id, recipient_email
  INTO v_sender_id, v_recipient_id, v_recipient_email
  FROM team_invitations
  WHERE id = invitation_id
    AND status = 'pending'
    AND expires_at > NOW()
    AND (
      recipient_id = auth.uid() 
      OR recipient_email = v_current_user_email
    );
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;
  
  -- If recipient_id is NULL, update it now
  IF v_recipient_id IS NULL THEN
    v_recipient_id := auth.uid();
    
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
END;
$$ LANGUAGE plpgsql;
