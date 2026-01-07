-- ✅ Dodaj polityki RLS dla daily_steps

-- 1. Pozwól użytkownikom INSERT swoich kroków
CREATE POLICY "Users can insert their own daily steps"
ON daily_steps
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 2. Pozwól użytkownikom UPDATE swoich kroków
CREATE POLICY "Users can update their own daily steps"
ON daily_steps
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Pozwól użytkownikom SELECT swoich kroków
CREATE POLICY "Users can select their own daily steps"
ON daily_steps
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Sprawdź czy polityki zostały dodane
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'daily_steps'
ORDER BY policyname;
