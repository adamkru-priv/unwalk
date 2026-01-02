-- Updated function that also creates team_challenge_invitation
CREATE OR REPLACE FUNCTION create_team_challenge_with_invite(
  p_host_user_id UUID,
  p_invited_user_id UUID,
  p_admin_challenge_id UUID,
  p_team_id UUID,
  p_host_device_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host_challenge_id UUID;
  v_invited_challenge_id UUID;
  v_invitation_id UUID;
  v_result JSON;
BEGIN
  -- 1. Create user_challenge for HOST (active)
  INSERT INTO public.user_challenges (
    user_id,
    device_id,
    admin_challenge_id,
    team_id,
    status,
    current_steps,
    started_at,
    last_resumed_at
  )
  VALUES (
    p_host_user_id,
    p_host_device_id,
    p_admin_challenge_id,
    p_team_id,
    'active',
    0,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_host_challenge_id;

  -- 2. Create user_challenge for INVITED USER (paused = waiting for accept)
  INSERT INTO public.user_challenges (
    user_id,
    device_id,
    admin_challenge_id,
    team_id,
    status,
    current_steps
  )
  VALUES (
    p_invited_user_id,
    p_invited_user_id::text,
    p_admin_challenge_id,
    p_team_id,
    'paused',
    0
  )
  RETURNING id INTO v_invited_challenge_id;

  -- 3. Create team_challenge_invitation (so invited user gets notification)
  INSERT INTO public.team_challenge_invitations (
    host_user_id,
    invited_user_id,
    admin_challenge_id,
    team_id,
    host_challenge_id,
    invited_challenge_id,
    status
  )
  VALUES (
    p_host_user_id,
    p_invited_user_id,
    p_admin_challenge_id,
    p_team_id,
    v_host_challenge_id,
    v_invited_challenge_id,
    'pending'
  )
  RETURNING id INTO v_invitation_id;

  -- 4. Return all IDs as JSON
  v_result := json_build_object(
    'host_challenge_id', v_host_challenge_id,
    'invited_challenge_id', v_invited_challenge_id,
    'invitation_id', v_invitation_id,
    'team_id', p_team_id
  );

  RAISE NOTICE 'Success! Created team challenge with invitation: %', v_result;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION create_team_challenge_with_invite TO authenticated;

SELECT 'Function updated - now creates team_challenge_invitation!' as status;
