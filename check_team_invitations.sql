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
