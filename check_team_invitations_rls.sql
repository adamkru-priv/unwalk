-- Sprawdź RLS policies dla team_challenge_invitations
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'team_challenge_invitations'
ORDER BY cmd, policyname;

-- Sprawdź czy RLS jest włączone
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'team_challenge_invitations';
