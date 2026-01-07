-- Sprawdź czy kroki zostały zapisane do daily_steps

SELECT 
    'Latest steps in daily_steps' as info,
    id,
    user_id,
    device_id,
    date,
    steps,
    created_at,
    updated_at,
    NOW() - updated_at as seconds_ago
FROM daily_steps
WHERE user_id = '72c48a7c-729e-4e43-9039-4ddc737fc0fa'
ORDER BY updated_at DESC
LIMIT 5;

-- Ile rekordów dzisiaj?
SELECT 
    'Total records today' as info,
    COUNT(*) as count,
    MAX(steps) as max_steps,
    MAX(updated_at) as last_update
FROM daily_steps
WHERE user_id = '72c48a7c-729e-4e43-9039-4ddc737fc0fa'
AND date = CURRENT_DATE;
