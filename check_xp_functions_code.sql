-- ========================================
-- 🔍 Sprawdź kod funkcji związanych z XP
-- ========================================

-- 1. Funkcja add_xp_to_user
SELECT 
  'add_xp_to_user' as function_name,
  pg_get_functiondef((SELECT oid FROM pg_proc WHERE proname = 'add_xp_to_user' LIMIT 1)) as function_code;

-- 2. Funkcja claim_quest_reward
SELECT 
  'claim_quest_reward' as function_name,
  pg_get_functiondef((SELECT oid FROM pg_proc WHERE proname = 'claim_quest_reward' LIMIT 1)) as function_code;

-- 3. Funkcja update_user_streak (🎯 PODEJRZANA - może dać streak bonus)
SELECT 
  'update_user_streak' as function_name,
  pg_get_functiondef((SELECT oid FROM pg_proc WHERE proname = 'update_user_streak' LIMIT 1)) as function_code;

-- 4. Sprawdź kolumny związane ze streak w users
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND (
    column_name LIKE '%streak%'
    OR column_name LIKE '%login%'
    OR column_name LIKE '%last%'
  )
ORDER BY ordinal_position;

-- 5. Wartości streak dla obu userów
SELECT 
  email,
  display_name,
  total_points
FROM users
WHERE email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
ORDER BY email;
