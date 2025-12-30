-- ========================================
-- 🔍 Znajdź WSZYSTKIE możliwe źródła XP
-- ========================================

-- 1. Sprawdź czy są tabele związane z achievements/badges/streaks
SELECT 
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%achievement%'
    OR table_name LIKE '%badge%'
    OR table_name LIKE '%streak%'
    OR table_name LIKE '%reward%'
    OR table_name LIKE '%bonus%'
    OR table_name LIKE '%login%'
  )
ORDER BY table_name;

-- 2. Sprawdź kolumny w users związane ze streak
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

-- 3. Sprawdź wartości streak dla obu userów
SELECT 
  email,
  display_name,
  total_points,
  created_at
FROM users
WHERE email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
ORDER BY email;

-- 4. Sprawdź funkcję add_xp_to_user - jak działa?
SELECT pg_get_functiondef((
  SELECT oid FROM pg_proc WHERE proname = 'add_xp_to_user' LIMIT 1
)) as function_definition;

-- 5. Sprawdź wszystkie funkcje które mogą dodawać XP
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name LIKE '%xp%'
    OR routine_name LIKE '%reward%'
    OR routine_name LIKE '%bonus%'
    OR routine_name LIKE '%streak%'
  )
ORDER BY routine_name;

-- 6. Sprawdź czy są triggery które mogą dodawać XP automatycznie
SELECT 
  trigger_name,
  event_object_table as table_name,
  action_timing,
  event_manipulation as event,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND (
    trigger_name LIKE '%xp%'
    OR trigger_name LIKE '%reward%'
    OR trigger_name LIKE '%streak%'
    OR action_statement LIKE '%xp%'
    OR action_statement LIKE '%total_points%'
  )
ORDER BY trigger_name;

-- 7. Historia: Kiedy total_points się zmieniało? (jeśli mamy audit log)
-- Sprawdźmy czy istnieje tabela audit_log
SELECT EXISTS(
  SELECT 1 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'audit_log'
) as has_audit_log;
