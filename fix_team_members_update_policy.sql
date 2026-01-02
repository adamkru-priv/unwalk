-- 1. Sprawdź aktualne UPDATE policies dla team_members
SELECT 
  policyname,
  cmd,
  qual AS "using_expression",
  with_check AS "with_check_expression"
FROM pg_policies
WHERE tablename = 'team_members'
  AND cmd = 'UPDATE';

-- 2. Usuń starą policy (jeśli istnieje)
DROP POLICY IF EXISTS "Users can update their own team member records" ON team_members;
DROP POLICY IF EXISTS "team_members_update_policy" ON team_members;

-- 3. Utwórz nową policy która pozwala członkom aktualizować swoje zaproszenia
CREATE POLICY "Members can update their invitation status" 
ON team_members
FOR UPDATE
USING (
  -- Użytkownik może aktualizować rekordy gdzie jest:
  -- 1. Właścicielem zespołu (user_id)
  auth.uid() = user_id 
  OR 
  -- 2. Członkiem zespołu (member_id) - żeby mógł zaakceptować zaproszenie
  auth.uid() = member_id
)
WITH CHECK (
  -- Same rules for WITH CHECK
  auth.uid() = user_id 
  OR 
  auth.uid() = member_id
);

-- 4. Sprawdź czy policy została utworzona
SELECT 
  policyname,
  cmd,
  qual AS "using_expression"
FROM pg_policies
WHERE tablename = 'team_members'
  AND cmd = 'UPDATE';
