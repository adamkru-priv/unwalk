-- Sprawdź aktualną UPDATE policy dla team_members
SELECT 
  policyname,
  cmd,
  qual AS "using_expression",
  with_check AS "with_check_expression"
FROM pg_policies
WHERE tablename = 'team_members'
  AND cmd = 'UPDATE'
ORDER BY policyname;
