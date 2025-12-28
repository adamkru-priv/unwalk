-- Szybka diagnoza - sprawdź tylko triggery i ostatnie powiadomienia

-- 1. CZY TRIGGERY ISTNIEJĄ?
SELECT 
  tgname as trigger_name,
  CASE tgenabled
    WHEN 'O' THEN '✅ ENABLED'
    WHEN 'D' THEN '❌ DISABLED'
    ELSE tgenabled::text
  END as status
FROM pg_trigger t
WHERE tgrelid = 'public.user_challenges'::regclass
  AND tgname LIKE '%push%'
ORDER BY tgname;

-- 2. CZY SĄ POWIADOMIENIA W KOLEJCE?
SELECT 
  type,
  status,
  COUNT(*) as count,
  MAX(created_at) as last_created
FROM push_outbox
GROUP BY type, status
ORDER BY last_created DESC;

-- 3. OSTATNIE 3 POWIADOMIENIA
SELECT 
  type,
  title,
  body,
  status,
  created_at
FROM push_outbox
ORDER BY created_at DESC
LIMIT 3;
