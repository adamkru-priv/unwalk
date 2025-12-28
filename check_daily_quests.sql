-- Sprawdź czy są dzisiejsze questy dla użytkownika

-- 1. Sprawdź czy tabela daily_quests istnieje
SELECT 
  table_name
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name = 'daily_quests';

-- 2. Sprawdź strukturę tabeli daily_quests
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'daily_quests'
ORDER BY ordinal_position;

-- 3. Sprawdź dzisiejsze questy dla adam.krusz@gmail.com
SELECT 
  id::text,
  user_id::text,
  quest_type,
  target_value,
  current_progress,
  completed,
  claimed,
  xp_reward,
  quest_date,
  created_at
FROM daily_quests
WHERE user_id = (SELECT id FROM users WHERE email = 'adam.krusz@gmail.com')
  AND quest_date = CURRENT_DATE
ORDER BY created_at DESC;