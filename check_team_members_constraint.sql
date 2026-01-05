-- Check team_members structure and constraints
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'team_members'::regclass
  AND conname LIKE '%user_ids%';

-- Check if invited users exist in team_members
SELECT 
  user_id,
  member_id,
  challenge_role,
  challenge_status,
  active_challenge_id
FROM team_members
WHERE user_id = (SELECT id FROM users WHERE email = 'adam.kruszo@gmail.com')
ORDER BY created_at DESC
LIMIT 10;
