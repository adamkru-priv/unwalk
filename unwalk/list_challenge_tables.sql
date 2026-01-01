-- Sprawdź wszystkie tabele związane z challenge'ami
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%challenge%'
    OR table_name LIKE '%quest%'
  )
ORDER BY table_name;

-- Sprawdź strukturę tabeli user_challenges (jeśli istnieje)
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'user_challenges'
  AND table_schema = 'public'
ORDER BY ordinal_position;
