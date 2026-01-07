-- Sprawdź czy w ogóle są jakieś dane w daily_steps

-- 1. Wszystkie rekordy dla Twojego user_id
SELECT 
    'All records for user' as info,
    COUNT(*) as total_records,
    MIN(date) as first_date,
    MAX(date) as last_date,
    SUM(steps) as total_steps
FROM daily_steps
WHERE user_id = '72c48a7c-729e-4e43-9039-4ddc737fc0fa';

-- 2. Ostatnie 10 rekordów
SELECT 
    'Last 10 records' as info,
    date,
    steps,
    created_at,
    updated_at
FROM daily_steps
WHERE user_id = '72c48a7c-729e-4e43-9039-4ddc737fc0fa'
ORDER BY date DESC, updated_at DESC
LIMIT 10;

-- 3. Sprawdź czy JAKIEKOLWIEK dane istnieją w tabeli (dla dowolnego użytkownika)
SELECT 
    'Any data in table?' as info,
    COUNT(*) as total_all_users,
    COUNT(DISTINCT user_id) as unique_users,
    MAX(updated_at) as last_activity
FROM daily_steps;

-- 4. Sprawdź strukturę funkcji sync_steps (czy używa daily_steps?)
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_name LIKE '%sync%step%'
AND routine_schema = 'public';
