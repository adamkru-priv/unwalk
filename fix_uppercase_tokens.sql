-- Fix uppercase APNs tokens to lowercase
-- APNs requires hex tokens to be lowercase
UPDATE device_push_tokens
SET token = LOWER(token), updated_at = NOW()
WHERE platform = 'ios' 
  AND token != LOWER(token);

-- Show affected rows
SELECT 
  user_id,
  platform,
  LEFT(token, 20) || '...' as token_preview,
  updated_at
FROM device_push_tokens
WHERE platform = 'ios';
