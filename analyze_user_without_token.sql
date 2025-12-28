-- Szczegółowa analiza użytkownika bez tokenu

-- 1. Kim jest ten użytkownik?
SELECT 
  id::text,
  email,
  display_name,
  is_guest,
  push_enabled,
  device_id,
  created_at,
  last_login_at
FROM users
WHERE id = '7223589d-e74d-4b5f-9991-891ab67a9951';

-- 2. Czy miał kiedyś token, który został usunięty?
-- (sprawdzamy czy w push_outbox były kiedyś powiadomienia 'sent' dla tego usera)
SELECT 
  type,
  status,
  COUNT(*) as count,
  MIN(created_at) as first_notification,
  MAX(created_at) as last_notification
FROM push_outbox
WHERE user_id = '7223589d-e74d-4b5f-9991-891ab67a9951'
GROUP BY type, status
ORDER BY status, type;

-- 3. Czy są inne użytkownicy z tym samym device_id (duplikaty guest/auth)?
SELECT 
  u.id::text,
  u.email,
  u.display_name,
  u.is_guest,
  dpt.token IS NOT NULL as has_token,
  u.created_at
FROM users u
LEFT JOIN device_push_tokens dpt ON u.id = dpt.user_id
WHERE u.device_id = (
  SELECT device_id FROM users WHERE id = '7223589d-e74d-4b5f-9991-891ab67a9951'
)
ORDER BY u.created_at DESC;
