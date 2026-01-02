-- Sprawdź RLS policies dla team_members
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
WHERE tablename = 'team_members'
ORDER BY cmd;

-- Sprawdź czy RLS jest włączone
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'team_members';

-- Test: Spróbuj zaktualizować rekord jako zaproszony użytkownik
-- (uruchom to jako adam.krusz@gmail.com)
UPDATE team_members
SET challenge_status = 'accepted'
WHERE id = '5c9d457f-f4d5-4d52-ae8a-92c33c7c1caf'
  AND member_id = auth.uid()
  AND challenge_status = 'invited'
RETURNING id, challenge_status, member_id, user_id;
