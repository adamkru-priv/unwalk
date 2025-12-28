-- Check your pending team challenge invitations
SELECT 
  tci.id,
  tci.challenge_id,
  tci.status,
  tci.invited_at,
  ac.title as challenge_title,
  u.display_name as invited_user
FROM team_challenge_invitations tci
JOIN admin_challenges ac ON ac.id = tci.challenge_id
JOIN users u ON u.id = tci.invited_user
WHERE tci.invited_by = (SELECT id FROM users WHERE email LIKE '%adam%' OR display_name LIKE '%adam%' LIMIT 1)
ORDER BY tci.invited_at DESC;
