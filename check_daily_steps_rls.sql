-- Sprawdź RLS policies dla daily_steps

-- 1. Czy RLS jest włączony?
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'daily_steps';

-- 2. Jakie są polityki?
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'daily_steps';

-- 3. Sprawdź czy tabela w ogóle istnieje i jej strukturę
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'daily_steps'
ORDER BY ordinal_position;
