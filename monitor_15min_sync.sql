-- ============================================
-- 📊 MONITOR 15-MINUTOWEJ SYNCHRONIZACJI
-- ============================================
-- Sprawdza czy kroki są zapisywane regularnie co 15 minut

-- 1️⃣ Ostatnie wpisy z daily_steps (sprawdź czy są aktualne)
SELECT 
    '🔍 Last 10 sync entries' as info,
    user_id,
    date,
    steps,
    updated_at,
    NOW() - updated_at as time_since_sync,
    CASE 
        WHEN NOW() - updated_at < INTERVAL '15 minutes' THEN '✅ Fresh (< 15min)'
        WHEN NOW() - updated_at < INTERVAL '30 minutes' THEN '⚠️ Recent (15-30min)'
        ELSE '❌ Old (> 30min)'
    END as sync_status
FROM daily_steps
WHERE user_id = '72c48a7c-729e-4e43-9039-4ddc737fc0fa'
ORDER BY updated_at DESC
LIMIT 10;

-- 2️⃣ Analiza interwałów między zapisami (czy rzeczywiście co 15 min?)
WITH sync_intervals AS (
    SELECT 
        date,
        updated_at,
        steps,
        LAG(updated_at) OVER (PARTITION BY user_id ORDER BY updated_at) as prev_sync,
        updated_at - LAG(updated_at) OVER (PARTITION BY user_id ORDER BY updated_at) as interval_duration
    FROM daily_steps
    WHERE user_id = '72c48a7c-729e-4e43-9039-4ddc737fc0fa'
    AND date >= CURRENT_DATE - INTERVAL '1 day'
)
SELECT 
    '⏱️ Sync intervals (last 24h)' as info,
    date,
    updated_at,
    steps,
    interval_duration,
    EXTRACT(EPOCH FROM interval_duration) / 60 as minutes_between_syncs,
    CASE 
        WHEN interval_duration IS NULL THEN '🆕 First sync'
        WHEN interval_duration < INTERVAL '10 minutes' THEN '⚡️ Very frequent (< 10min)'
        WHEN interval_duration BETWEEN INTERVAL '10 minutes' AND INTERVAL '20 minutes' THEN '✅ Normal (~15min)'
        WHEN interval_duration BETWEEN INTERVAL '20 minutes' AND INTERVAL '40 minutes' THEN '⚠️ Delayed (~30min)'
        ELSE '❌ Very delayed (> 40min)'
    END as sync_pattern
FROM sync_intervals
ORDER BY updated_at DESC
LIMIT 20;

-- 3️⃣ Statystyki synchronizacji (średni interwał)
WITH sync_stats AS (
    SELECT 
        updated_at - LAG(updated_at) OVER (PARTITION BY user_id ORDER BY updated_at) as interval_duration
    FROM daily_steps
    WHERE user_id = '72c48a7c-729e-4e43-9039-4ddc737fc0fa'
    AND date >= CURRENT_DATE - INTERVAL '1 day'
)
SELECT 
    '📈 Sync statistics (last 24h)' as info,
    COUNT(*) as total_syncs,
    ROUND(AVG(EXTRACT(EPOCH FROM interval_duration) / 60)::numeric, 2) as avg_minutes_between_syncs,
    ROUND(MIN(EXTRACT(EPOCH FROM interval_duration) / 60)::numeric, 2) as min_minutes,
    ROUND(MAX(EXTRACT(EPOCH FROM interval_duration) / 60)::numeric, 2) as max_minutes,
    CASE 
        WHEN AVG(EXTRACT(EPOCH FROM interval_duration) / 60) BETWEEN 12 AND 18 THEN '✅ Perfect ~15min average'
        WHEN AVG(EXTRACT(EPOCH FROM interval_duration) / 60) BETWEEN 10 AND 20 THEN '👍 Good average'
        ELSE '⚠️ Check background sync'
    END as overall_status
FROM sync_stats
WHERE interval_duration IS NOT NULL;

-- 4️⃣ Sprawdź czy są luki > 20 minut (missed syncs)
WITH gaps AS (
    SELECT 
        date,
        updated_at as gap_start,
        LEAD(updated_at) OVER (ORDER BY updated_at) as gap_end,
        LEAD(updated_at) OVER (ORDER BY updated_at) - updated_at as gap_duration
    FROM daily_steps
    WHERE user_id = '72c48a7c-729e-4e43-9039-4ddc737fc0fa'
    AND date >= CURRENT_DATE - INTERVAL '1 day'
)
SELECT 
    '🚨 Gaps > 20 minutes (missed syncs)' as info,
    gap_start,
    gap_end,
    gap_duration,
    EXTRACT(EPOCH FROM gap_duration) / 60 as minutes_gap,
    CASE 
        WHEN EXTRACT(EPOCH FROM gap_duration) / 60 > 60 THEN '❌ CRITICAL: > 1 hour'
        WHEN EXTRACT(EPOCH FROM gap_duration) / 60 > 40 THEN '⚠️ WARNING: > 40 min'
        ELSE '⚠️ Minor delay: 20-40 min'
    END as severity
FROM gaps
WHERE gap_duration > INTERVAL '20 minutes'
ORDER BY gap_start DESC
LIMIT 10;

-- 5️⃣ Timeline kroków dzisiaj (czy rosną regularnie?)
SELECT 
    '📊 Today timeline (should grow every 15min)' as info,
    TO_CHAR(updated_at, 'HH24:MI') as time_of_sync,
    steps,
    steps - LAG(steps) OVER (ORDER BY updated_at) as steps_added,
    EXTRACT(EPOCH FROM (updated_at - LAG(updated_at) OVER (ORDER BY updated_at))) / 60 as minutes_since_last
FROM daily_steps
WHERE user_id = '72c48a7c-729e-4e43-9039-4ddc737fc0fa'
AND date = CURRENT_DATE
ORDER BY updated_at DESC
LIMIT 20;

-- 6️⃣ Czy background sync działa? (sprawdź aktywność poza godzinami aktywnego użytkowania)
SELECT 
    '🌙 Background sync detection' as info,
    TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI') as sync_time,
    steps,
    EXTRACT(HOUR FROM updated_at) as hour_of_day,
    CASE 
        WHEN EXTRACT(HOUR FROM updated_at) BETWEEN 0 AND 6 THEN '🌙 Night sync (background working!)'
        WHEN EXTRACT(HOUR FROM updated_at) BETWEEN 7 AND 23 THEN '☀️ Day sync (user active or background)'
    END as sync_type
FROM daily_steps
WHERE user_id = '72c48a7c-729e-4e43-9039-4ddc737fc0fa'
AND date >= CURRENT_DATE - INTERVAL '2 days'
ORDER BY updated_at DESC
LIMIT 30;

-- 7️⃣ Porównanie z aktywnością challenge (czy kroki są zapisywane przed/po aktualizacji challenge?)
SELECT 
    '🎯 Challenge updates vs step syncs' as info,
    sc.title as challenge_name,
    sc.current_steps,
    sc.updated_at as challenge_updated,
    ds.steps as daily_steps_total,
    ds.updated_at as steps_synced,
    sc.updated_at - ds.updated_at as time_diff,
    CASE 
        WHEN ABS(EXTRACT(EPOCH FROM (sc.updated_at - ds.updated_at))) < 60 THEN '✅ Synced together (< 1min)'
        WHEN ABS(EXTRACT(EPOCH FROM (sc.updated_at - ds.updated_at))) < 300 THEN '👍 Close (< 5min)'
        ELSE '⚠️ Delayed sync'
    END as sync_alignment
FROM solo_challenges sc
LEFT JOIN daily_steps ds ON ds.user_id = sc.user_id AND ds.date = CURRENT_DATE
WHERE sc.user_id = '72c48a7c-729e-4e43-9039-4ddc737fc0fa'
AND sc.status = 'active'
ORDER BY sc.updated_at DESC
LIMIT 10;

-- 8️⃣ PODSUMOWANIE: CZY 15-MINUTOWA SYNCHRONIZACJA DZIAŁA?
SELECT 
    '🎯 FINAL VERDICT' as summary,
    (SELECT COUNT(*) FROM daily_steps 
     WHERE user_id = '72c48a7c-729e-4e43-9039-4ddc737fc0fa' 
     AND date >= CURRENT_DATE - INTERVAL '1 day') as total_syncs_24h,
    (SELECT ROUND(AVG(EXTRACT(EPOCH FROM interval_duration) / 60)::numeric, 2)
     FROM (
         SELECT updated_at - LAG(updated_at) OVER (ORDER BY updated_at) as interval_duration
         FROM daily_steps
         WHERE user_id = '72c48a7c-729e-4e43-9039-4ddc737fc0fa'
         AND date >= CURRENT_DATE - INTERVAL '1 day'
     ) intervals
     WHERE interval_duration IS NOT NULL) as avg_interval_minutes,
    (SELECT MAX(updated_at) FROM daily_steps 
     WHERE user_id = '72c48a7c-729e-4e43-9039-4ddc737fc0fa') as last_sync,
    NOW() - (SELECT MAX(updated_at) FROM daily_steps 
             WHERE user_id = '72c48a7c-729e-4e43-9039-4ddc737fc0fa') as time_since_last_sync,
    CASE 
        WHEN (SELECT COUNT(*) FROM daily_steps 
              WHERE user_id = '72c48a7c-729e-4e43-9039-4ddc737fc0fa' 
              AND date >= CURRENT_DATE - INTERVAL '1 day') >= 90 
        AND (SELECT AVG(EXTRACT(EPOCH FROM interval_duration) / 60)
             FROM (
                 SELECT updated_at - LAG(updated_at) OVER (ORDER BY updated_at) as interval_duration
                 FROM daily_steps
                 WHERE user_id = '72c48a7c-729e-4e43-9039-4ddc737fc0fa'
                 AND date >= CURRENT_DATE - INTERVAL '1 day'
             ) intervals
             WHERE interval_duration IS NOT NULL) BETWEEN 12 AND 18
        THEN '✅ PERFECT: Background sync works every ~15min!'
        WHEN (SELECT AVG(EXTRACT(EPOCH FROM interval_duration) / 60)
             FROM (
                 SELECT updated_at - LAG(updated_at) OVER (ORDER BY updated_at) as interval_duration
                 FROM daily_steps
                 WHERE user_id = '72c48a7c-729e-4e43-9039-4ddc737fc0fa'
                 AND date >= CURRENT_DATE - INTERVAL '1 day'
             ) intervals
             WHERE interval_duration IS NOT NULL) BETWEEN 10 AND 25
        THEN '👍 GOOD: Background sync mostly working'
        WHEN NOW() - (SELECT MAX(updated_at) FROM daily_steps 
                      WHERE user_id = '72c48a7c-729e-4e43-9039-4ddc737fc0fa') > INTERVAL '30 minutes'
        THEN '❌ PROBLEM: No sync in last 30 minutes!'
        ELSE '⚠️ CHECK: Sync intervals irregular'
    END as status;
