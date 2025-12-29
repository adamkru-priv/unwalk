-- Create RPC function to create team challenges with team_id
-- This bypasses RLS policies that might block team_id

CREATE OR REPLACE FUNCTION create_team_challenge(
  p_user_id UUID,
  p_admin_challenge_id UUID,
  p_team_id UUID
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  admin_challenge_id UUID,
  team_id UUID,
  status TEXT,
  current_steps INTEGER,
  started_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.user_challenges (
    device_id,
    user_id,
    admin_challenge_id,
    team_id,
    status,
    current_steps,
    started_at
  )
  VALUES (
    p_user_id, -- Use user_id as device_id for authenticated users
    p_user_id,
    p_admin_challenge_id,
    p_team_id,
    'active',
    0,
    NOW()
  )
  RETURNING 
    user_challenges.id,
    user_challenges.user_id,
    user_challenges.admin_challenge_id,
    user_challenges.team_id,
    user_challenges.status,
    user_challenges.current_steps,
    user_challenges.started_at;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_team_challenge TO authenticated;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Created create_team_challenge() function';
  RAISE NOTICE 'This function bypasses RLS and ensures team_id is set correctly';
END $$;
