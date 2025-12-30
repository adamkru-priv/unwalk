-- ========================================
-- 🔍 Sprawdź funkcję add_xp_to_user - czy zapisuje historię?
-- ========================================

-- 1. Kod funkcji add_xp_to_user
SELECT pg_get_functiondef((
  SELECT oid FROM pg_proc WHERE proname = 'add_xp_to_user' LIMIT 1
)) as function_code;

-- 2. Sprawdź czy istnieje tabela do logowania XP (xp_transactions, xp_log, audit_log, etc.)
SELECT 
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%xp%'
    OR table_name LIKE '%transaction%'
    OR table_name LIKE '%audit%'
    OR table_name LIKE '%log%'
    OR table_name LIKE '%history%'
  )
ORDER BY table_name;

-- 3. Sprawdź wszystkie kolumny w users (może jest xp_from_quests, xp_from_streaks, etc.)
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 4. Porównanie: Actual XP vs wszystkie znane źródła
WITH xp_sources AS (
  SELECT 
    u.id as user_id,
    u.email,
    u.total_points as actual_xp,
    -- Quests
    COALESCE(SUM(dq.xp_reward) FILTER (WHERE dq.completed = true), 0) as xp_from_quests,
    -- Challenges
    COALESCE(SUM(ac.points) FILTER (WHERE uc.status = 'claimed'), 0) as xp_from_challenges,
    -- Streak (przy longest_streak=2 powinno być 0)
    CASE 
      WHEN u.longest_streak >= 30 THEN 300 + 100 + 50 + 15 + 30 + 30
      WHEN u.longest_streak >= 28 THEN 100 + 50 + 15 + 30 + 30
      WHEN u.longest_streak >= 21 THEN 100 + 50 + 15 + 30
      WHEN u.longest_streak >= 14 THEN 100 + 50 + 15
      WHEN u.longest_streak >= 7 THEN 50 + 15
      WHEN u.longest_streak >= 3 THEN 15
      ELSE 0
    END as xp_from_streaks
  FROM users u
  LEFT JOIN daily_quests dq ON dq.user_id = u.id
  LEFT JOIN user_challenges uc ON uc.user_id = u.id
  LEFT JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
  WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
  GROUP BY u.id, u.email, u.total_points, u.longest_streak
)
SELECT 
  email,
  actual_xp,
  xp_from_quests,
  xp_from_challenges,
  xp_from_streaks,
  (actual_xp - xp_from_quests - xp_from_challenges - xp_from_streaks) as truly_unexplained_xp
FROM xp_sources
ORDER BY email;
