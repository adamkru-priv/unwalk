-- Sprawdź czy synchronizacja INSERT'uje nowe rekordy czy UPDATE'uje istniejące

-- 1. Ile rekordów na dzień dzisiejszy?
SELECT 
    'Records for today' as info,
    COUNT(*) as total_records,
    COUNT(DISTINCT date) as unique_dates,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created,
    MIN(updated_at) as first_updated,
    MAX(updated_at) as last_updated
FROM daily_steps
WHERE user_id = '72c48a7c-729e-4e43-9039-4ddc737fc0fa'
AND date = CURRENT_DATE;

-- 2. Pokazuj wszystkie rekordy z dzisiaj
SELECT 
    'All today records' as info,
    id,
    date,
    steps,
    created_at,
    updated_at,
    CASE 
        WHEN created_at = updated_at THEN '🆕 INSERT (never updated)'
        ELSE '🔄 UPDATED'
    END as record_type,
    updated_at - created_at as time_between_create_and_update
FROM daily_steps
WHERE user_id = '72c48a7c-729e-4e43-9039-4ddc737fc0fa'
AND date = CURRENT_DATE
ORDER BY created_at DESC
LIMIT 20;

-- 3. Sprawdź czy jest tylko 1 rekord na dzień (UPDATE) czy wiele (INSERT)
SELECT 
    'Records per day (last 7 days)' as info,
    date,
    COUNT(*) as records_count,
    CASE 
        WHEN COUNT(*) = 1 THEN '✅ One record (UPDATE mode)'
        ELSE '⚠️ Multiple records (INSERT mode?)'
    END as mode
FROM daily_steps
WHERE user_id = '72c48a7c-729e-4e43-9039-4ddc737fc0fa'
AND date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY date
ORDER BY date DESC;

-- 4. Jeśli jest tylko 1 rekord na dzień, pokaż częstotliwość UPDATE
SELECT 
    'Update frequency (if single record per day)' as info,
    date,
    steps,
    created_at,
    updated_at,
    updated_at - created_at as total_time_span,
    EXTRACT(EPOCH FROM (updated_at - created_at)) / 60 as minutes_of_updates
FROM daily_steps
WHERE user_id = '72c48a7c-729e-4e43-9039-4ddc737fc0fa'
AND date >= CURRENT_DATE - INTERVAL '3 days'
ORDER BY date DESC;
