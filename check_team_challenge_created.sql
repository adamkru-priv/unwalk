-- Check if team challenge was created correctly
SELECT 
  id,
  user_id,
  admin_challenge_id,
  team_id,
  status,
  started_at,
  current_steps,
  created_at
FROM user_challenges
WHERE team_id IS NOT NULL
  AND status = 'active'
ORDER BY created_at DESC
LIMIT 5;
