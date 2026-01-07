-- Sprawdź czy Edge Function sync-steps była w ogóle wywołana

-- Nie możemy sprawdzić logów Edge Function przez SQL
-- Ale możemy sprawdzić czy coś trafiło do daily_steps

SELECT 
    'Sprawdzam daily_steps dla dzisiaj' as info,
    *
FROM daily_steps
WHERE user_id = '72c48a7c-729e-4e43-9039-4ddc737fc0fa'
AND date = CURRENT_DATE
ORDER BY updated_at DESC;

-- Wszystkie rekordy (niezależnie od daty)
SELECT 
    'Wszystkie rekordy dla tego usera' as info,
    date,
    steps,
    device_id,
    created_at,
    updated_at
FROM daily_steps
WHERE user_id = '72c48a7c-729e-4e43-9039-4ddc737fc0fa'
ORDER BY date DESC, updated_at DESC
LIMIT 10;

-- Sprawdź RLS - czy jest włączony?
SELECT 
    'RLS Status' as info,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'daily_steps';

-- Sprawdź polityki RLS
SELECT 
    'RLS Policies' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'daily_steps';
