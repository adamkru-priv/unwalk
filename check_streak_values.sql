-- ========================================
-- 🔍 Sprawdź streak values dla obu userów
-- ========================================

-- 1. Wartości streak i calculated bonuses
SELECT 
  email,
  display_name,
  total_points as current_xp,
  current_streak,
  longest_streak,
  last_activity_date,
  created_at
FROM users
WHERE email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
ORDER BY email;

-- 2. Policz ile streak bonuses powinni byli dostać
WITH RECURSIVE streak_bonuses AS (
  -- Wylicz ile bonusów dostali na podstawie longest_streak
  SELECT 
    email,
    longest_streak,
    CASE 
      WHEN longest_streak >= 3 THEN 15 ELSE 0 
    END +
    CASE 
      WHEN longest_streak >= 7 THEN 50 ELSE 0 
    END +
    CASE 
      WHEN longest_streak >= 14 THEN 100 ELSE 0 
    END +
    CASE 
      WHEN longest_streak >= 21 THEN 30 ELSE 0  -- 21 % 7 = 0 (co 7 dni)
    END +
    CASE 
      WHEN longest_streak >= 28 THEN 30 ELSE 0  -- 28 % 7 = 0
    END +
    CASE 
      WHEN longest_streak >= 30 THEN 300 ELSE 0 
    END as estimated_streak_xp
  FROM users
  WHERE email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
)
SELECT 
  u.email,
  u.total_points as actual_xp,
  COALESCE(SUM(dq.xp_reward) FILTER (WHERE dq.completed = true), 0) as xp_from_quests,
  sb.estimated_streak_xp,
  (u.total_points - COALESCE(SUM(dq.xp_reward) FILTER (WHERE dq.completed = true), 0) - sb.estimated_streak_xp) as still_unexplained
FROM users u
LEFT JOIN daily_quests dq ON dq.user_id = u.id
JOIN streak_bonuses sb ON sb.email = u.email
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
GROUP BY u.id, u.email, u.total_points, sb.estimated_streak_xp
ORDER BY u.email;

-- 3. Historia XP z add_xp_to_user (jeśli zapisuje do jakiejś tabeli)
-- Sprawdźmy czy add_xp_to_user zapisuje do audit/history
SELECT 
  routine_name,
  pg_get_functiondef((SELECT oid FROM pg_proc WHERE proname = 'add_xp_to_user' LIMIT 1)) as function_code;
