-- Sprawdź polityki RLS dla daily_steps

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
WHERE tablename = 'daily_steps'
ORDER BY policyname;

-- Sprawdź czy RLS jest włączony
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'daily_steps';
