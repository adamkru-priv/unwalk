-- Enhanced version with error handling and logging
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
  -- Log start
  RAISE NOTICE 'Creating team challenge: host=%, invited=%, challenge=%, team=%', 
    p_host_user_id, p_invited_user_id, p_admin_challenge_id, p_team_id;

  -- 1. Create user_challenge for HOST (active)
  BEGIN
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
    
    RAISE NOTICE 'Host challenge created: %', v_host_challenge_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Failed to create host challenge: % %', SQLERRM, SQLSTATE;
    RETURN json_build_object('error', 'Failed to create host challenge: ' || SQLERRM);
  END;

  -- 2. Create user_challenge for INVITED USER (pending)
  BEGIN
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
      'pending',
      0
    )
    RETURNING id INTO v_invited_challenge_id;
    
    RAISE NOTICE 'Invited challenge created: %', v_invited_challenge_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Failed to create invited challenge: % %', SQLERRM, SQLSTATE;
    RETURN json_build_object('error', 'Failed to create invited challenge: ' || SQLERRM);
  END;

  -- 3. Return both IDs as JSON
  v_result := json_build_object(
    'host_challenge_id', v_host_challenge_id,
    'invited_challenge_id', v_invited_challenge_id,
    'team_id', p_team_id
  );

  RAISE NOTICE 'Success! Returning: %', v_result;
  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_team_challenge_with_invite TO authenticated;

SELECT 'Function updated with error handling!' as status;
