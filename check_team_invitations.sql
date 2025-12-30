-- Check all team challenge invitations for current user
SELECT 
  tci.id,
  tci.challenge_id,
  tci.invited_by,
  tci.status,
  tci.invited_at,
  ac.title as challenge_title,
  u.display_name as invited_by_name,
  invited_u.display_name as invited_user_name
FROM team_challenge_invitations tci
LEFT JOIN admin_challenges ac ON ac.id = tci.challenge_id
LEFT JOIN users u ON u.id = tci.invited_by
LEFT JOIN users invited_u ON invited_u.id = tci.invited_user
ORDER BY tci.invited_at DESC
LIMIT 20;
