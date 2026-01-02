-- 1. Sprawdź czy kolumna nickname istnieje
SELECT 
  column_name, 
  data_type, 
  character_maximum_length,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'nickname';

-- 2. Sprawdź czy są jakieś ustawione nicki
SELECT COUNT(*) as users_with_nickname
FROM users
WHERE nickname IS NOT NULL AND nickname != '';

-- 3. Sprawdź zawartość funkcji get_campaign_leaderboard (czy używa nickname)
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'get_campaign_leaderboard'
LIMIT 1;

-- 4. Sprawdź definicję widoku my_team (czy używa nickname)
SELECT definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname = 'my_team';
