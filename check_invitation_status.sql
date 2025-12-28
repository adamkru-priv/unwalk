-- Check adam's invitation status
SELECT 
  tci.id,
  tci.status,
  tci.invited_at,
  u.display_name,
  ac.title as challenge_title
FROM team_challenge_invitations tci
JOIN users u ON u.id = tci.invited_user
JOIN admin_challenges ac ON ac.id = tci.challenge_id
WHERE u.display_name = 'adam'
ORDER BY tci.invited_at DESC
LIMIT 5;
