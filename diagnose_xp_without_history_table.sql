-- ========================================
-- 🔍 DIAGNOZA XP: Bez tabeli xp_history
-- ========================================

-- 1. 📊 Sprawdź kolumny w users związane z XP
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND (
    column_name LIKE '%xp%'
    OR column_name LIKE '%level%'
    OR column_name LIKE '%point%'
    OR column_name = 'total_points'
  )
ORDER BY ordinal_position;

-- 2. 📈 Aktualne wartości XP/points dla obu userów
SELECT 
  email,
  display_name,
  total_points,
  created_at
FROM users
WHERE email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
ORDER BY email;

-- 3. 🎯 Policz ile XP POWINNI mieć (z claimed challenges)
SELECT 
  u.email,
  u.display_name,
  u.total_points as current_points_in_db,
  COUNT(DISTINCT uc.id) as claimed_challenges_count,
  COALESCE(SUM(ac.points), 0) as total_xp_from_challenges,
  (u.total_points - COALESCE(SUM(ac.points), 0)) as difference
FROM users u
LEFT JOIN user_challenges uc ON uc.user_id = u.id AND uc.status = 'claimed'
LEFT JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
GROUP BY u.id, u.email, u.display_name, u.total_points
ORDER BY u.email;

-- 4. 📜 Lista wszystkich claimed challenges
SELECT 
  u.email,
  ac.title as challenge_name,
  ac.points as xp_reward,
  uc.status,
  uc.claimed_at,
  uc.completed_at,
  uc.id as user_challenge_id
FROM user_challenges uc
JOIN users u ON uc.user_id = u.id
JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
  AND uc.status = 'claimed'
ORDER BY u.email, uc.claimed_at DESC;

-- 5. 🔍 Sprawdź definicję funkcji add_xp_to_user
SELECT 
  routine_name,
  routine_type,
  pg_get_functiondef((
    SELECT oid 
    FROM pg_proc 
    WHERE proname = 'add_xp_to_user'
    LIMIT 1
  )) as function_definition;

-- 6. 🎮 Sprawdź czy funkcja calculate_xp_for_level działa poprawnie
SELECT 
  level,
  calculate_xp_for_level(level) as xp_required
FROM generate_series(1, 10) as level;

-- 7. 📊 Podsumowanie: Porównaj actual vs expected XP
WITH expected_xp AS (
  SELECT 
    u.id as user_id,
    u.email,
    COALESCE(SUM(ac.points), 0) as expected_from_challenges,
    COALESCE(SUM(dq.xp_reward), 0) as expected_from_quests
  FROM users u
  LEFT JOIN user_challenges uc ON uc.user_id = u.id AND uc.status = 'claimed'
  LEFT JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
  LEFT JOIN daily_quests dq ON dq.user_id = u.id AND dq.status = 'completed'
  WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
  GROUP BY u.id, u.email
)
SELECT 
  u.email,
  u.total_points as actual_xp,
  ex.expected_from_challenges,
  ex.expected_from_quests,
  (ex.expected_from_challenges + ex.expected_from_quests) as total_expected_xp,
  (u.total_points - (ex.expected_from_challenges + ex.expected_from_quests)) as difference
FROM users u
JOIN expected_xp ex ON ex.user_id = u.id
ORDER BY u.email;
