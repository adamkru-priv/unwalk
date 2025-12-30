-- Sprawdź wszystkie tabele związane z PUSH notifications
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%push%'
ORDER BY table_name;

-- Sprawdź strukturę tabeli push_outbox
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'push_outbox'
ORDER BY ordinal_position;
