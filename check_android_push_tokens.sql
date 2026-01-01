-- Check if any Android push tokens exist
SELECT 
  dpt.id,
  dpt.user_id,
  dpt.platform,
  dpt.token,
  dpt.created_at,
  dpt.updated_at,
  u.email,
  u.display_name,
  u.is_guest
FROM device_push_tokens dpt
LEFT JOIN users u ON u.id = dpt.user_id
WHERE dpt.platform = 'android'
ORDER BY dpt.updated_at DESC
LIMIT 10;

-- Count total tokens by platform
SELECT 
  platform,
  COUNT(*) as count
FROM device_push_tokens
GROUP BY platform;
