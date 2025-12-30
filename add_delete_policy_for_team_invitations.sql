-- ========================================
-- FIX: Dodaj DELETE policy dla team_challenge_invitations
-- ========================================

-- 1. Sprawdź obecne policies
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN 'READ'
    WHEN cmd = 'INSERT' THEN 'CREATE'
    WHEN cmd = 'UPDATE' THEN 'UPDATE'
    WHEN cmd = 'DELETE' THEN 'DELETE'
  END as operation,
  qual as policy_check
FROM pg_policies
WHERE tablename = 'team_challenge_invitations'
ORDER BY cmd, policyname;

-- 2. Dodaj DELETE policy - user może usunąć tylko swoje zaproszenia (invited_by)
DROP POLICY IF EXISTS "Users can delete their own invitations" ON team_challenge_invitations;

CREATE POLICY "Users can delete their own invitations"
ON team_challenge_invitations
FOR DELETE
TO authenticated
USING (auth.uid() = invited_by);

-- 3. Sprawdź czy policy została dodana
SELECT 
  policyname,
  cmd,
  qual as policy_check
FROM pg_policies
WHERE tablename = 'team_challenge_invitations'
  AND cmd = 'DELETE';

-- 4. Testuj DELETE ponownie (podmień ID na swoje)
-- Po dodaniu policy to DELETE powinno zwrócić usunięty rekord!
SELECT 'Teraz możesz przetestować DELETE ponownie:' as info;
SELECT 'DELETE FROM team_challenge_invitations WHERE id = ''TWOJE_ID'' AND invited_by = auth.uid() RETURNING *;' as test_query;
