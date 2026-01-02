-- Create function to create team challenge with host and invited member
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
AS $$
DECLARE
  v_host_challenge_id UUID;
  v_invited_challenge_id UUID;
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

  -- 2. Create user_challenge for INVITED USER (pending)
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
    p_invited_user_id::text, -- Use user_id as placeholder device_id (will be updated when they accept)
    p_admin_challenge_id,
    p_team_id,
    'pending',
    0
  )
  RETURNING id INTO v_invited_challenge_id;

  -- 3. Return both IDs as JSON
  v_result := json_build_object(
    'host_challenge_id', v_host_challenge_id,
    'invited_challenge_id', v_invited_challenge_id,
    'team_id', p_team_id
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_team_challenge_with_invite TO authenticated;

-- Test message
SELECT 'Function create_team_challenge_with_invite created successfully!' as status;
