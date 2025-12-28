-- Sprawdź strukturę tabeli admin_challenges
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'admin_challenges'
ORDER BY ordinal_position;