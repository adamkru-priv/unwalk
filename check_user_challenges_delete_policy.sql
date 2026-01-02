-- Sprawdź DELETE policies dla user_challenges
SELECT 
  policyname,
  cmd,
  qual AS "using_expression",
  with_check AS "with_check_expression"
FROM pg_policies
WHERE tablename = 'user_challenges'
  AND cmd = 'DELETE'
ORDER BY policyname;

-- Sprawdź czy RLS jest włączone
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'user_challenges';
