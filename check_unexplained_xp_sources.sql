-- ========================================
-- 🔍 Skąd mają "unexplained XP"?
-- ========================================

-- 1. 📜 Wszystkie daily quests (completed vs claimed)
SELECT 
  u.email,
  dq.quest_type,
  dq.target_value,
  dq.xp_reward,
  dq.completed,
  dq.claimed,
  dq.completed_at,
  dq.claimed_at,
  dq.quest_date,
  CASE 
    WHEN dq.completed = true AND dq.claimed = false THEN '⚠️ Completed but not claimed'
    WHEN dq.completed = true AND dq.claimed = true THEN '✅ Completed and claimed'
    ELSE '❌ Not completed'
  END as status_desc
FROM daily_quests dq
JOIN users u ON dq.user_id = u.id
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
ORDER BY u.email, dq.quest_date DESC, dq.created_at DESC;

-- 2. 🎯 Suma XP z WSZYSTKICH quests (completed = true, bez względu na claimed)
SELECT 
  u.email,
  COUNT(*) FILTER (WHERE dq.completed = true) as total_completed_quests,
  COUNT(*) FILTER (WHERE dq.claimed = true) as total_claimed_quests,
  SUM(dq.xp_reward) FILTER (WHERE dq.completed = true) as xp_if_all_completed_counted,
  SUM(dq.xp_reward) FILTER (WHERE dq.claimed = true) as xp_if_only_claimed_counted
FROM users u
LEFT JOIN daily_quests dq ON dq.user_id = u.id
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
GROUP BY u.email
ORDER BY u.email;

-- 3. 📊 Porównanie: Czy completed quests wyjaśniają unexplained XP?
WITH quest_analysis AS (
  SELECT 
    u.email,
    u.total_points as total_xp,
    COALESCE(SUM(dq.xp_reward) FILTER (WHERE dq.claimed = true), 0) as xp_from_claimed,
    COALESCE(SUM(dq.xp_reward) FILTER (WHERE dq.completed = true AND dq.claimed = false), 0) as xp_from_completed_not_claimed,
    COALESCE(SUM(dq.xp_reward) FILTER (WHERE dq.completed = true), 0) as xp_from_all_completed
  FROM users u
  LEFT JOIN daily_quests dq ON dq.user_id = u.id
  WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
  GROUP BY u.id, u.email, u.total_points
)
SELECT 
  email,
  total_xp,
  xp_from_claimed,
  xp_from_completed_not_claimed,
  xp_from_all_completed,
  (total_xp - xp_from_claimed) as unexplained_xp,
  (total_xp - xp_from_all_completed) as still_unexplained_after_completed
FROM quest_analysis
ORDER BY email;

-- 4. 🔍 Sprawdź definicję funkcji add_xp_to_user (może była używana ręcznie?)
SELECT 
  routine_name,
  pg_get_functiondef((SELECT oid FROM pg_proc WHERE proname = 'add_xp_to_user' LIMIT 1)) as function_code;

-- 5. ⚠️ Czy są completed quests BEZ claimed?
SELECT 
  u.email,
  COUNT(*) as completed_but_not_claimed,
  SUM(dq.xp_reward) as missing_xp_if_should_be_given
FROM daily_quests dq
JOIN users u ON dq.user_id = u.id
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
  AND dq.completed = true
  AND dq.claimed = false
GROUP BY u.email;

-- 6. �� Timeline: Kiedy dostali XP? (z completed_at i claimed_at)
SELECT 
  u.email,
  dq.quest_date,
  dq.quest_type,
  dq.xp_reward,
  dq.completed_at,
  dq.claimed_at,
  CASE 
    WHEN dq.claimed_at IS NOT NULL THEN dq.claimed_at
    WHEN dq.completed_at IS NOT NULL THEN dq.completed_at
    ELSE dq.created_at
  END as effective_xp_date
FROM daily_quests dq
JOIN users u ON dq.user_id = u.id
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
  AND dq.completed = true
ORDER BY u.email, effective_xp_date DESC;
