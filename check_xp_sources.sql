-- ========================================
-- 🔍 Skąd mają XP? (nie z claimed challenges)
-- ========================================

-- 1. Sprawdź WSZYSTKIE user_challenges (nie tylko claimed)
SELECT 
  u.email,
  ac.title as challenge_name,
  ac.points as xp_reward,
  uc.status,
  uc.claimed_at,
  uc.completed_at,
  uc.created_at,
  uc.id as user_challenge_id
FROM user_challenges uc
JOIN users u ON uc.user_id = u.id
JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
ORDER BY u.email, uc.created_at DESC;

-- 2. Sprawdź daily_quests (completed = XP)
SELECT 
  u.email,
  dq.title as quest_name,
  dq.xp_reward,
  dq.status,
  dq.completed_at,
  dq.created_at
FROM daily_quests dq
JOIN users u ON dq.user_id = u.id
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
  AND dq.status = 'completed'
ORDER BY u.email, dq.completed_at DESC;

-- 3. Policz XP z daily quests
SELECT 
  u.email,
  COUNT(*) as completed_quests,
  SUM(dq.xp_reward) as total_xp_from_quests
FROM daily_quests dq
JOIN users u ON dq.user_id = u.id
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
  AND dq.status = 'completed'
GROUP BY u.email;

-- 4. Porównaj: Actual XP vs XP z quests
SELECT 
  u.email,
  u.total_points as actual_xp,
  COALESCE(SUM(dq.xp_reward), 0) as xp_from_quests,
  (u.total_points - COALESCE(SUM(dq.xp_reward), 0)) as unexplained_xp
FROM users u
LEFT JOIN daily_quests dq ON dq.user_id = u.id AND dq.status = 'completed'
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
GROUP BY u.id, u.email, u.total_points;

-- 5. Sprawdź czy są jakieś stare/usunięte challenges
SELECT 
  u.email,
  COUNT(*) as total_challenges,
  COUNT(CASE WHEN uc.status = 'active' THEN 1 END) as active,
  COUNT(CASE WHEN uc.status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN uc.status = 'claimed' THEN 1 END) as claimed,
  COUNT(CASE WHEN uc.status = 'failed' THEN 1 END) as failed
FROM users u
LEFT JOIN user_challenges uc ON uc.user_id = u.id
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
GROUP BY u.email;

-- 6. Sprawdź czy funkcja add_xp_to_user została kiedyś wywołana
-- (sprawdzamy logi/audit trail jeśli istnieje)
SELECT 
  routine_name,
  pg_get_functiondef((
    SELECT oid 
    FROM pg_proc 
    WHERE proname = 'add_xp_to_user'
    LIMIT 1
  )) as function_code;
