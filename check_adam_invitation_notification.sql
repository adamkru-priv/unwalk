-- 1️⃣ Sprawdź czy push notification został utworzony dla usera "adam"
SELECT 
  po.id,
  po.user_id,
  po.type,
  po.title,
  po.body,
  po.status,
  po.last_error,
  po.attempts,
  po.created_at,
  po.sent_at,
  u.display_name,
  u.email
FROM push_outbox po
LEFT JOIN users u ON u.id = po.user_id
WHERE po.user_id = '7223589d-e74d-4b5f-9991-891ab67a9951'
  AND po.type = 'team_challenge_invitation'
ORDER BY po.created_at DESC
LIMIT 3;

-- 2️⃣ Sprawdź status zaproszenia z emailami
SELECT 
  tci.id,
  tci.status,
  tci.invited_at,
  u_sender.display_name as sender,
  u_sender.email as sender_email,
  u_invited.display_name as invited,
  u_invited.email as invited_email,
  ac.title as challenge_title
FROM team_challenge_invitations tci
LEFT JOIN users u_sender ON u_sender.id = tci.invited_by
LEFT JOIN users u_invited ON u_invited.id = tci.invited_user
LEFT JOIN admin_challenges ac ON ac.id = tci.challenge_id
WHERE tci.id = 'bf631e5c-d30e-466d-b8cb-ae4e822499cf';

-- 3️⃣ Sprawdź device_id obu userów (dla native push notifications)
SELECT 
  u.id,
  u.display_name,
  u.email,
  uc.device_id
FROM users u
LEFT JOIN user_challenges uc ON uc.user_id = u.id
WHERE u.id IN (
  'b9bfb86f-6447-4752-9c37-d6fdffb8b84b',  -- adam.krusz
  '7223589d-e74d-4b5f-9991-891ab67a9951'   -- adam
)
GROUP BY u.id, u.display_name, u.email, uc.device_id
ORDER BY u.display_name;
