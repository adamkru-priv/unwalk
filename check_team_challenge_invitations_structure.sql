-- Check structure of team_challenge_invitations table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'team_challenge_invitations'
ORDER BY ordinal_position;
