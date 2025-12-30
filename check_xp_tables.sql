-- Sprawdź jakie tabele związane z XP/gamification istnieją
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%xp%' 
    OR table_name LIKE '%gamification%'
    OR table_name LIKE '%level%'
    OR table_name LIKE '%achievement%'
    OR table_name LIKE '%badge%'
  )
ORDER BY table_name;

-- Sprawdź kolumny w tabeli users związane z XP
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
  )
ORDER BY ordinal_position;

-- Sprawdź czy są funkcje/views związane z gamification
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name LIKE '%gamification%'
    OR routine_name LIKE '%xp%'
    OR routine_name LIKE '%level%'
  )
ORDER BY routine_name;

-- Sprawdź views
SELECT 
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%gamification%'
    OR table_name LIKE '%xp%'
    OR table_name LIKE '%level%'
  );
