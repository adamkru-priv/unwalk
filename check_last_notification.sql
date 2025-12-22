-- Sprawdź ostatnie powiadomienie ze szczegółami
SELECT 
  id,
  type,
  title,
  body,
  status,
  attempts,
  last_error,
  created_at,
  sent_at,
  data
FROM push_outbox
WHERE id = '84450225-a22c-4a4f-8ce8-2f0aad6d0594'
ORDER BY created_at DESC;

-- Sprawdź też token push dla tego usera
SELECT 
  token,
  platform,
  created_at,
  updated_at
FROM device_push_tokens
WHERE user_id = 'b9bfb86f-6447-4752-9c37-d6fdffb8b84b';
