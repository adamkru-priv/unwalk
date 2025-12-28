-- Sprawdź czy funkcja generate_daily_quest istnieje w bazie

SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'generate_daily_quest'
  AND pronamespace = 'public'::regnamespace;

-- Sprawdź ostatnie questy w systemie (dla jakiegokolwiek użytkownika)
SELECT 
  user_id::text,
  quest_date,
  quest_type,
  target_value,
  xp_reward,
  completed,
  claimed,
  created_at
FROM daily_quests
ORDER BY created_at DESC
LIMIT 10;