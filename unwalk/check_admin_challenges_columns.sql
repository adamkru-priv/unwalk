-- Sprawdź strukturę tabeli admin_challenges
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'admin_challenges'
  AND table_schema = 'public'
ORDER BY ordinal_position;
