-- 1. Sprawdź czy DELETE policy istnieje
SELECT 
  policyname,
  cmd,
  qual as policy_condition
FROM pg_policies
WHERE tablename = 'team_challenge_invitations'
  AND cmd = 'DELETE';

-- 2. Sprawdź kto jest invited_by dla tego konkretnego zaproszenia
SELECT 
  id,
  invited_by,
  invited_user,
  challenge_id,
  status,
  created_at
FROM team_challenge_invitations
WHERE id = 'a90ef2d1-381f-49a6-ae79-04daf1463e43';

-- 3. Sprawdź kto jest zalogowany (auth.uid())
SELECT auth.uid() as current_user_id;

-- 4. Sprawdź czy current_user = invited_by
SELECT 
  id,
  invited_by,
  invited_by = auth.uid() as can_delete,
  auth.uid() as current_user
FROM team_challenge_invitations
WHERE id = 'a90ef2d1-381f-49a6-ae79-04daf1463e43';
