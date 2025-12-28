-- Szczegółowa analiza dla adam.krusz@gmail.com

-- 1. Podstawowe info o użytkowniku
SELECT 
  id::text,
  email,
  display_name,
  is_guest,
  push_enabled,
  device_id,
  created_at
FROM users
WHERE email = 'adam.krusz@gmail.com';

-- 2. Sprawdź czy ma token
SELECT 
  user_id::text,
  token,
  platform,
  created_at,
  updated_at
FROM device_push_tokens
WHERE user_id = (SELECT id FROM users WHERE email = 'adam.krusz@gmail.com');

-- 3. Historia powiadomień (ostatnie 10)
SELECT 
  type,
  title,
  body,
  status,
  attempts,
  last_error,
  created_at,
  sent_at
FROM push_outbox
WHERE user_id = (SELECT id FROM users WHERE email = 'adam.krusz@gmail.com')
ORDER BY created_at DESC
LIMIT 10;

-- 4. Statystyki powiadomień
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as first_at,
  MAX(created_at) as last_at
FROM push_outbox
WHERE user_id = (SELECT id FROM users WHERE email = 'adam.krusz@gmail.com')
GROUP BY status
ORDER BY status;
