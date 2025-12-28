-- ============================================
-- MOVEE: Diagnoza systemu powiadomień push
-- ============================================

-- 1. Sprawdź czy wszystkie triggery push istnieją i są aktywne
SELECT 
  tgname as trigger_name,
  CASE tgenabled
    WHEN 'O' THEN '✅ ENABLED'
    WHEN 'D' THEN '❌ DISABLED'
    WHEN 'R' THEN '⚠️ REPLICA'
    WHEN 'A' THEN '⚠️ ALWAYS'
    ELSE '❓ UNKNOWN'
  END as status,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'public.user_challenges'::regclass
  AND tgname LIKE '%push%'
ORDER BY tgname;

-- 2. Sprawdź czy funkcje push istnieją
SELECT 
  proname as function_name,
  '✅ EXISTS' as status
FROM pg_proc 
WHERE proname IN (
  'enqueue_challenge_started_push',
  'enqueue_challenge_completed_push',
  'enqueue_ready_to_claim_push',
  'enqueue_milestone_push',
  'enqueue_challenge_assigned_push',
  'enqueue_challenge_assignment_status_push',
  'enqueue_challenge_assignment_started_push'
)
ORDER BY proname;

-- 3. Sprawdź czy tabela push_outbox istnieje i ma poprawną strukturę
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'push_outbox'
ORDER BY ordinal_position;

-- 4. Sprawdź ostatnie wpisy w push_outbox
SELECT 
  id::text,
  user_id::text,
  type,
  title,
  body,
  status,
  attempts,
  last_error,
  created_at,
  sent_at
FROM push_outbox
ORDER BY created_at DESC
LIMIT 10;

-- 5. Sprawdź czy użytkownicy mają włączone powiadomienia
SELECT 
  id::text,
  display_name,
  push_enabled,
  created_at
FROM users
WHERE push_enabled = true
ORDER BY created_at DESC
LIMIT 5;

-- 6. Sprawdź czy są zarejestrowane tokeny push
SELECT 
  COUNT(*) as total_tokens,
  COUNT(DISTINCT user_id) as users_with_tokens,
  platform
FROM device_push_tokens
GROUP BY platform;

-- 7. Sprawdź ostatnie user_challenges (które powinny wywołać trigger)
SELECT 
  id::text,
  user_id::text,
  admin_challenge_id::text,
  status,
  current_steps,
  started_at,
  completed_at,
  created_at
FROM user_challenges
ORDER BY created_at DESC
LIMIT 5;
