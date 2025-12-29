-- Check if team challenges have team_id set correctly
SELECT 
  id,
  user_id,
  admin_challenge_id,
  team_id,
  current_steps,
  status,
  created_at,
  started_at,
  (SELECT title FROM admin_challenges WHERE id = user_challenges.admin_challenge_id) as challenge_title,
  (SELECT is_team_challenge FROM admin_challenges WHERE id = user_challenges.admin_challenge_id) as is_team_challenge
FROM user_challenges
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 10;
