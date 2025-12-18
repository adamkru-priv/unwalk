-- Fix accept_team_invitation: robust recipient matching for email-based invitations
-- - Use auth.jwt()->>'email' as a fallback when public.users.email is NULL
-- - Compare emails case-insensitively (lower())
-- - Keep existing security checks (pending + not expired + recipient match)

CREATE OR REPLACE FUNCTION public.accept_team_invitation(invitation_id UUID)
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
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Prefer email stored in public.users; fall back to JWT email.
  SELECT COALESCE(u.email, NULLIF(auth.jwt() ->> 'email', ''))
    INTO v_current_user_email
  FROM public.users u
  WHERE u.id = v_current_user_id;

  -- If the user row is missing (rare), still try JWT email.
  IF v_current_user_email IS NULL THEN
    v_current_user_email := NULLIF(auth.jwt() ->> 'email', '');
  END IF;

  -- Get invitation details
  SELECT ti.sender_id, ti.recipient_id, ti.recipient_email
    INTO v_sender_id, v_recipient_id, v_recipient_email
  FROM public.team_invitations ti
  WHERE ti.id = invitation_id
    AND ti.status = 'pending'
    AND ti.expires_at > NOW()
    AND (
      ti.recipient_id = v_current_user_id
      OR (
        v_current_user_email IS NOT NULL
        AND lower(ti.recipient_email) = lower(v_current_user_email)
      )
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- If recipient_id is NULL, update it now
  IF v_recipient_id IS NULL THEN
    v_recipient_id := v_current_user_id;

    UPDATE public.team_invitations
    SET recipient_id = v_recipient_id,
        updated_at = NOW()
    WHERE id = invitation_id;
  END IF;

  -- Update invitation status
  UPDATE public.team_invitations
  SET status = 'accepted',
      responded_at = NOW(),
      updated_at = NOW()
  WHERE id = invitation_id;

  -- Create bidirectional team relationship
  INSERT INTO public.team_members (user_id, member_id)
  VALUES
    (v_sender_id, v_recipient_id),
    (v_recipient_id, v_sender_id)
  ON CONFLICT (user_id, member_id) DO NOTHING;

  RAISE NOTICE 'Team invitation % accepted by user %', invitation_id, v_current_user_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.accept_team_invitation(UUID) TO authenticated;

COMMENT ON FUNCTION public.accept_team_invitation IS
  'Accept team invitation and create bidirectional team relationship (robust email matching)';
