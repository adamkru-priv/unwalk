-- Sprawdź ostatnie zaproszenia do teamu
SELECT 
  id,
  sender_id,
  recipient_email,
  status,
  message,
  invited_at,
  expires_at,
  (SELECT display_name FROM users WHERE id = sender_id) as sender_name,
  (SELECT email FROM users WHERE id = sender_id) as sender_email
FROM team_invitations
ORDER BY invited_at DESC
LIMIT 5;

-- Check if invitations are being saved
SELECT 
  i.id,
  i.status,
  i.invited_at,
  sender.display_name as invited_by_name,
  receiver.display_name as invited_user_name,
  c.title as challenge_title
FROM team_challenge_invitations i
JOIN users sender ON sender.id = i.invited_by
JOIN users receiver ON receiver.id = i.invited_user
JOIN admin_challenges c ON c.id = i.challenge_id
ORDER BY i.invited_at DESC
LIMIT 10;
