-- Sprawdź czy triggery istnieją
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  tgtype,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'public.user_challenges'::regclass
ORDER BY tgname;

-- Sprawdź czy funkcje istnieją
SELECT 
  proname as function_name,
  prosrc as source
FROM pg_proc 
WHERE proname IN ('enqueue_challenge_started_push', 'enqueue_challenge_completed_push');
