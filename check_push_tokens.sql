-- Sprawdź tokeny push dla użytkownika
SELECT 
  user_id,
  token,
  platform,
  created_at,
  updated_at
FROM device_push_tokens
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE '%adam%' OR display_name LIKE '%adam%'
)
ORDER BY updated_at DESC;

-- Sprawdź ostatnie powiadomienia
SELECT 
  id,
  user_id,
  type,
  title,
  body,
  status,
  attempts,
  last_error,
  created_at,
  sent_at
FROM push_outbox
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE '%adam%' OR display_name LIKE '%adam%'
)
ORDER BY created_at DESC
LIMIT 5;
