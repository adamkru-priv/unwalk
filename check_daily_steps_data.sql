-- Sprawdź czy są JAKIEKOLWIEK dane w daily_steps
SELECT 
  ds.user_id,
  u.nickname,
  u.email,
  ds.date,
  ds.steps,
  ds.device_id,
  ds.created_at,
  ds.updated_at
FROM daily_steps ds
LEFT JOIN users u ON u.id = ds.user_id
ORDER BY ds.updated_at DESC
LIMIT 50;

-- Sprawdź statystyki
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  MAX(date) as latest_date,
  SUM(steps) as total_steps
FROM daily_steps;

-- Sprawdź czy sync_steps była kiedykolwiek wywołana
-- (sprawdź czy funkcja istnieje)
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'sync_steps';
