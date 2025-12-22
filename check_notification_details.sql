-- Sprawdź szczegóły ostatniego powiadomienia
SELECT 
  id,
  type,
  title,
  body,
  status,
  attempts,
  last_error,
  created_at,
  sent_at
FROM push_outbox
WHERE id = '84450225-a22c-4a4f-8ce8-2f0aad6d0594';
