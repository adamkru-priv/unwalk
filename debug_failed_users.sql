-- Sprawdź konkretnie użytkowników, którzy mają failed notifications
-- i czy mają zarejestrowane tokeny

-- 1. Lista użytkowników z failed notifications
SELECT DISTINCT 
  user_id::text,
  COUNT(*) as failed_count
FROM push_outbox
WHERE status = 'failed' 
  AND last_error = 'No push token registered for user'
GROUP BY user_id
ORDER BY failed_count DESC;

-- 2. Sprawdź czy ci użytkownicy mają tokeny
SELECT 
  po.user_id::text,
  COUNT(DISTINCT po.id) as failed_notifications,
  CASE 
    WHEN dpt.token IS NOT NULL THEN '✅ HAS TOKEN'
    ELSE '❌ NO TOKEN'
  END as token_status,
  dpt.token as device_token,
  dpt.updated_at as token_last_updated
FROM push_outbox po
LEFT JOIN device_push_tokens dpt ON po.user_id = dpt.user_id
WHERE po.status = 'failed' 
  AND po.last_error = 'No push token registered for user'
GROUP BY po.user_id, dpt.token, dpt.updated_at
ORDER BY failed_notifications DESC;

-- 3. Sprawdź czy user ma włączone powiadomienia (push_enabled)
SELECT 
  u.id::text,
  u.display_name,
  u.email,
  u.push_enabled,
  u.is_guest,
  CASE 
    WHEN dpt.token IS NOT NULL THEN '✅ HAS TOKEN'
    ELSE '❌ NO TOKEN'
  END as token_status
FROM users u
LEFT JOIN device_push_tokens dpt ON u.id = dpt.user_id
WHERE u.id IN (
  SELECT DISTINCT user_id 
  FROM push_outbox 
  WHERE status = 'failed' 
    AND last_error = 'No push token registered for user'
)
ORDER BY u.created_at DESC;
