-- Check if token exists for this user
SELECT 
  dpt.id,
  dpt.user_id,
  dpt.platform,
  dpt.token,
  dpt.created_at,
  dpt.updated_at,
  u.email,
  u.display_name
FROM device_push_tokens dpt
LEFT JOIN users u ON u.id = dpt.user_id
WHERE dpt.user_id = '0a83e847-dc5e-4773-8652-c904f2e01ea3'
ORDER BY dpt.updated_at DESC;

-- Check the failed notification
SELECT 
  po.id,
  po.user_id,
  po.platform,
  po.type,
  po.title,
  po.body,
  po.status,
  po.attempts,
  po.last_error,
  po.created_at,
  po.sent_at
FROM push_outbox po
WHERE po.user_id = '0a83e847-dc5e-4773-8652-c904f2e01ea3'
ORDER BY po.created_at DESC
LIMIT 5;
