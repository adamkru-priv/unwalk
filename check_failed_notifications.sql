-- Sprawdź szczegóły błędów w powiadomieniach

SELECT 
  type,
  title,
  status,
  attempts,
  last_error,
  created_at,
  sent_at
FROM push_outbox
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
