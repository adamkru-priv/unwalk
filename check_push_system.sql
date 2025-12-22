-- ============================================
-- Comprehensive Push Notification System Check
-- ============================================

-- 1. Check if user has push_enabled
SELECT 
  id::text,
  email,
  display_name,
  push_enabled,
  created_at
FROM users
WHERE email = 'adam.krusz@gmail.com';

-- 2. Check recent push_outbox entries
SELECT 
  id::text,
  user_id::text,
  type,
  title,
  body,
  status,
  created_at,
  sent_at,
  error_message
FROM push_outbox
WHERE user_id = (SELECT id FROM users WHERE email = 'adam.krusz@gmail.com')
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check if user has APNS token registered
SELECT 
  id::text,
  user_id::text,
  device_token,
  device_type,
  is_active,
  last_used_at,
  created_at
FROM push_tokens
WHERE user_id = (SELECT id FROM users WHERE email = 'adam.krusz@gmail.com')
ORDER BY created_at DESC;

-- 4. Check recent user_challenges (should trigger notifications)
SELECT 
  id::text,
  user_id::text,
  admin_challenge_id::text,
  status,
  current_steps,
  assigned_by::text,
  started_at,
  completed_at,
  created_at
FROM user_challenges
WHERE user_id = (SELECT id FROM users WHERE email = 'adam.krusz@gmail.com')
ORDER BY created_at DESC
LIMIT 5;

-- 5. Check if pg_cron job is running
SELECT 
  jobid,
  schedule,
  command,
  active,
  jobname
FROM cron.job
WHERE jobname LIKE '%push%';

-- 6. Check pg_cron job history
SELECT 
  jobid,
  runid,
  job_pid,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE '%push%')
ORDER BY start_time DESC
LIMIT 10;
