-- 1. Sprawdź czy kolumna nickname istnieje i czy ktoś ma ustawiony nick
SELECT 
  id,
  email,
  display_name,
  nickname,
  COALESCE(NULLIF(nickname, ''), display_name, 'User ' || SUBSTRING(id::TEXT, 1, 8)) as final_display_name
FROM users
WHERE is_guest = false
ORDER BY created_at DESC
LIMIT 10;

-- 2. Sprawdź czy my_team view używa nickname
SELECT definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname = 'my_team';

-- 3. Sprawdź czy my_sent_invitations używa nickname
SELECT definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname = 'my_sent_invitations';

-- 4. Sprawdź czy my_received_invitations używa nickname
SELECT definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname = 'my_received_invitations';
