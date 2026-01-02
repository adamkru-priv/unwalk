-- Sprawdź jakie tabele istnieją w bazie
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%xp%' 
    OR table_name LIKE '%point%'
    OR table_name LIKE '%campaign%'
  )
ORDER BY table_name;

-- Sprawdź strukturę tabeli users (czy ma kolumnę xp)
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name IN ('xp', 'level', 'total_xp', 'points', 'campaign_xp');

-- Sprawdź czy jest jakaś tabela z historią XP
SELECT 
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('xp_log', 'xp_history', 'user_xp', 'points_log', 'xp_transactions');
