-- ========================================
-- FIX: Dodaj DELETE policy dla team_challenge_invitations
-- ========================================

-- 1. Najpierw sprawdź obecne policies
SELECT 
  policyname,
  cmd,
  qual
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
  qual
FROM pg_policies
WHERE tablename = 'team_challenge_invitations'
  AND cmd = 'DELETE';

-- 4. Testuj DELETE (podmień invitation_id na swoje)
-- DELETE FROM team_challenge_invitations 
-- WHERE id = 'a90ef2d1-381f-49a6-ae79-04daf1463e43'
-- RETURNING *;
