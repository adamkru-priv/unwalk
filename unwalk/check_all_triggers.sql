-- Check ALL triggers on user_challenges table
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    t.tgenabled as enabled,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND c.relname = 'user_challenges'
AND NOT t.tgisinternal
ORDER BY t.tgname;

-- Also check what functions are called by these triggers
SELECT DISTINCT
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (
    p.proname LIKE '%challenge%'
    OR p.proname LIKE '%xp%'
    OR p.proname LIKE '%completion%'
)
ORDER BY p.proname;
