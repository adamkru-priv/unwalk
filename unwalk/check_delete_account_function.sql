-- Sprawdź czy funkcja delete_user_account istnieje
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%delete%account%'
ORDER BY routine_name;

-- Sprawdź wszystkie funkcje związane z usuwaniem użytkownika
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name LIKE '%delete%user%'
    OR routine_name LIKE '%remove%user%'
    OR routine_name LIKE '%delete%account%'
  )
ORDER BY routine_name;
