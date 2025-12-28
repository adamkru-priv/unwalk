-- Sprawdź czy są JAKIEKOLWIEK tokeny push w bazie
SELECT 
  user_id::text,
  platform,
  token,
  created_at,
  updated_at
FROM device_push_tokens
ORDER BY created_at DESC
LIMIT 10;

-- Sprawdź konkretnego użytkownika z failed notifications
SELECT 
  user_id::text,
  platform,
  LEFT(token, 20) || '...' as token_preview,
  created_at
FROM device_push_tokens
WHERE user_id IN (
  SELECT DISTINCT user_id 
  FROM push_outbox 
  WHERE status = 'failed' 
  AND last_error = 'No push token registered for user'
  LIMIT 5
);
