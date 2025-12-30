-- Sprawdź czy trigger istnieje
SELECT 
  t.tgname AS trigger_name,
  t.tgenabled AS enabled,
  p.proname AS function_name,
  pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'team_challenge_invitations'
ORDER BY t.tgname;

-- Sprawdź czy funkcja triggera istnieje
SELECT 
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
WHERE p.proname LIKE '%team%invitation%'
   OR p.proname LIKE '%notify_team%';
