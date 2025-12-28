-- TYMCZASOWE ROZWIĄZANIE: Ręcznie wygeneruj dzisiejszy quest dla adam.krusz@gmail.com

INSERT INTO daily_quests (
  id,
  user_id,
  quest_date,
  quest_type,
  target_value,
  current_progress,
  xp_reward,
  completed,
  claimed,
  created_at
)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM users WHERE email = 'adam.krusz@gmail.com'),
  CURRENT_DATE,
  'steps',  -- Quest typu: przejdź X kroków
  5000,     -- Cel: 5000 kroków
  0,        -- Początkowy progress: 0
  50,       -- Nagroda: 50 XP
  false,    -- Nie ukończone
  false,    -- Nie odebrane
  NOW()
)
ON CONFLICT (user_id, quest_date) DO NOTHING;

-- Sprawdź czy quest został utworzony
SELECT 
  quest_type,
  target_value,
  current_progress,
  xp_reward,
  completed,
  claimed
FROM daily_quests
WHERE user_id = (SELECT id FROM users WHERE email = 'adam.krusz@gmail.com')
  AND quest_date = CURRENT_DATE;