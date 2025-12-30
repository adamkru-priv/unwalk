-- ========================================
-- 🧹 CZYSZCZENIE STARYCH DANYCH TESTOWYCH
-- ========================================

-- 1. 📊 PRZED: Pokaż obecne wartości
SELECT 
  email,
  total_points as current_xp,
  current_streak,
  longest_streak,
  (SELECT COUNT(*) FROM daily_quests dq WHERE dq.user_id = u.id) as total_quests,
  (SELECT COUNT(*) FROM daily_quests dq WHERE dq.user_id = u.id AND dq.completed = true) as completed_quests,
  (SELECT COUNT(*) FROM user_challenges uc WHERE uc.user_id = u.id) as total_challenges
FROM users u
WHERE email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
ORDER BY email;

-- 2. 🧹 USUŃ STARE QUESTY (zostaw tylko dzisiejsze)
DELETE FROM daily_quests
WHERE user_id IN (
  SELECT id FROM users WHERE email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
)
AND quest_date < CURRENT_DATE;

-- 3. 🧹 USUŃ WSZYSTKIE CLAIMED CHALLENGES (stare testy)
DELETE FROM user_challenges
WHERE user_id IN (
  SELECT id FROM users WHERE email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
)
AND status = 'claimed';

-- 4. 🧹 USUŃ FAILED/COMPLETED CHALLENGES (stare testy)
DELETE FROM user_challenges
WHERE user_id IN (
  SELECT id FROM users WHERE email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
)
AND status IN ('failed', 'completed');

-- 5. 🔄 PRZELICZ XP NA PODSTAWIE AKTUALNYCH DANYCH
-- Policz ile XP powinni mieć (tylko z dzisiejszych questów)
WITH correct_xp AS (
  SELECT 
    u.id as user_id,
    COALESCE(SUM(dq.xp_reward) FILTER (WHERE dq.completed = true AND dq.quest_date = CURRENT_DATE), 0) as xp_from_today_quests
  FROM users u
  LEFT JOIN daily_quests dq ON dq.user_id = u.id
  WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
  GROUP BY u.id
)
UPDATE users u
SET 
  total_points = correct_xp.xp_from_today_quests,
  current_streak = 0,
  longest_streak = 0,
  last_activity_date = NULL,
  updated_at = NOW()
FROM correct_xp
WHERE u.id = correct_xp.user_id;

-- 6. 📊 PO: Pokaż nowe wartości
SELECT 
  email,
  total_points as new_xp,
  current_streak,
  longest_streak,
  (SELECT COUNT(*) FROM daily_quests dq WHERE dq.user_id = u.id) as remaining_quests,
  (SELECT COUNT(*) FROM daily_quests dq WHERE dq.user_id = u.id AND dq.completed = true) as completed_quests,
  (SELECT COUNT(*) FROM user_challenges uc WHERE uc.user_id = u.id) as remaining_challenges
FROM users u
WHERE email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
ORDER BY email;

-- 7. ✅ WERYFIKACJA: Sprawdź czy XP się zgadza
WITH verification AS (
  SELECT 
    u.email,
    u.total_points as xp_in_db,
    COALESCE(SUM(dq.xp_reward) FILTER (WHERE dq.completed = true), 0) as xp_from_quests,
    COALESCE(SUM(ac.points) FILTER (WHERE uc.status = 'claimed'), 0) as xp_from_challenges
  FROM users u
  LEFT JOIN daily_quests dq ON dq.user_id = u.id
  LEFT JOIN user_challenges uc ON uc.user_id = u.id
  LEFT JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
  WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
  GROUP BY u.id, u.email, u.total_points
)
SELECT 
  email,
  xp_in_db,
  xp_from_quests,
  xp_from_challenges,
  (xp_in_db - xp_from_quests - xp_from_challenges) as difference
FROM verification
ORDER BY email;
