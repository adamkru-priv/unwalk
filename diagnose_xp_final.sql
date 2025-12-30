-- ========================================
-- 🔍 DIAGNOZA XP: Skąd mają punkty?
-- ========================================

-- 1. 📊 PODSUMOWANIE: Actual XP vs źródła
SELECT 
  u.email,
  u.total_points as current_xp,
  -- Challenges
  COUNT(DISTINCT uc.id) FILTER (WHERE uc.status = 'completed') as completed_challenges,
  COUNT(DISTINCT uc.id) FILTER (WHERE uc.status = 'claimed') as claimed_challenges,
  COALESCE(SUM(ac.points) FILTER (WHERE uc.status = 'claimed'), 0) as xp_from_claimed_challenges,
  -- Daily Quests
  COUNT(DISTINCT dq.id) FILTER (WHERE dq.completed = true) as completed_quests,
  COUNT(DISTINCT dq.id) FILTER (WHERE dq.claimed = true) as claimed_quests,
  COALESCE(SUM(dq.xp_reward) FILTER (WHERE dq.claimed = true), 0) as xp_from_claimed_quests,
  -- Porównanie
  (u.total_points - COALESCE(SUM(ac.points) FILTER (WHERE uc.status = 'claimed'), 0) - COALESCE(SUM(dq.xp_reward) FILTER (WHERE dq.claimed = true), 0)) as unexplained_xp
FROM users u
LEFT JOIN user_challenges uc ON uc.user_id = u.id
LEFT JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
LEFT JOIN daily_quests dq ON dq.user_id = u.id
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
GROUP BY u.id, u.email, u.total_points
ORDER BY u.email;

-- 2. 📜 SZCZEGÓŁY: Wszystkie claimed quests
SELECT 
  u.email,
  dq.quest_type,
  dq.target_value,
  dq.current_progress,
  dq.xp_reward,
  dq.completed,
  dq.claimed,
  dq.completed_at,
  dq.claimed_at,
  dq.quest_date
FROM daily_quests dq
JOIN users u ON dq.user_id = u.id
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
  AND dq.claimed = true
ORDER BY u.email, dq.claimed_at DESC;

-- 3. 🎯 SZCZEGÓŁY: Wszystkie user_challenges (any status)
SELECT 
  u.email,
  ac.title as challenge_name,
  ac.points as xp_reward,
  uc.status,
  uc.completed_at,
  uc.claimed_at,
  uc.created_at
FROM user_challenges uc
JOIN users u ON uc.user_id = u.id
JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
ORDER BY u.email, uc.created_at DESC;

-- 4. 📊 BREAKDOWN: XP z każdego źródła osobno
WITH quest_xp AS (
  SELECT 
    u.email,
    COALESCE(SUM(dq.xp_reward) FILTER (WHERE dq.claimed = true), 0) as xp
  FROM users u
  LEFT JOIN daily_quests dq ON dq.user_id = u.id
  WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
  GROUP BY u.email
),
challenge_xp AS (
  SELECT 
    u.email,
    COALESCE(SUM(ac.points) FILTER (WHERE uc.status = 'claimed'), 0) as xp
  FROM users u
  LEFT JOIN user_challenges uc ON uc.user_id = u.id
  LEFT JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
  WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
  GROUP BY u.email
)
SELECT 
  u.email,
  u.total_points as total_xp_in_db,
  COALESCE(q.xp, 0) as xp_from_quests,
  COALESCE(c.xp, 0) as xp_from_challenges,
  (u.total_points - COALESCE(q.xp, 0) - COALESCE(c.xp, 0)) as unexplained_xp
FROM users u
LEFT JOIN quest_xp q ON q.email = u.email
LEFT JOIN challenge_xp c ON c.email = u.email
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
ORDER BY u.email;

-- 5. ⚠️ COMPLETED ale nie CLAIMED (mogą być braki!)
SELECT 
  u.email,
  'Daily Quests' as source,
  COUNT(*) as completed_but_not_claimed_count,
  SUM(dq.xp_reward) as missing_xp
FROM daily_quests dq
JOIN users u ON dq.user_id = u.id
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
  AND dq.completed = true
  AND dq.claimed = false
GROUP BY u.email

UNION ALL

SELECT 
  u.email,
  'Challenges' as source,
  COUNT(*) as completed_but_not_claimed_count,
  SUM(ac.points) as missing_xp
FROM user_challenges uc
JOIN users u ON uc.user_id = u.id
JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
  AND uc.status = 'completed'
GROUP BY u.email
ORDER BY email, source;
