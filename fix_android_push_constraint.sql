-- ✅ FIX: Add Android support to device_push_tokens table
-- Problem: Table only accepts platform = 'ios', Android gets 500 error

-- 1. Drop old CHECK constraint (ios only)
ALTER TABLE public.device_push_tokens 
  DROP CONSTRAINT IF EXISTS device_push_tokens_platform_check;

-- 2. Add new CHECK constraint (ios + android)
ALTER TABLE public.device_push_tokens 
  ADD CONSTRAINT device_push_tokens_platform_check 
  CHECK (platform IN ('ios', 'android'));

-- 3. Verify token column can handle long FCM tokens (Android tokens are ~150+ chars)
-- If token is varchar with a limit, we need to change it to text
-- This is a safe operation (text is the default in the schema)
ALTER TABLE public.device_push_tokens 
  ALTER COLUMN token TYPE text;

-- 4. Verify the fix
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.device_push_tokens'::regclass
  AND contype = 'c';
