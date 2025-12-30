-- Sprawdź strukturę tabeli daily_quests
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'daily_quests'
ORDER BY ordinal_position;

-- Sprawdź kilka przykładowych rekordów
SELECT *
FROM daily_quests
LIMIT 5;
