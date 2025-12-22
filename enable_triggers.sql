-- Włącz WSZYSTKIE 3 triggery push notifications
ALTER TABLE public.user_challenges ENABLE TRIGGER trg_push_challenge_started;
ALTER TABLE public.user_challenges ENABLE TRIGGER trg_push_challenge_completed;
ALTER TABLE public.user_challenges ENABLE TRIGGER trg_push_challenge_assignment_started;

-- Sprawdź czy są włączone
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ ENABLED'
    WHEN tgenabled = 'D' THEN '❌ DISABLED'
    ELSE tgenabled::text
  END as status
FROM pg_trigger t
WHERE tgrelid = 'public.user_challenges'::regclass
  AND tgname LIKE '%push%'
ORDER BY tgname;
