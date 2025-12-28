-- Delete all pending team challenge invitations for your user
-- This will clear the "Not Started" challenge from the UI

DELETE FROM team_challenge_invitations
WHERE invited_by = (
  SELECT id FROM users 
  WHERE email LIKE '%adam%' OR display_name LIKE '%adam%' 
  ORDER BY created_at DESC 
  LIMIT 1
);

-- Verify deletion
SELECT COUNT(*) as remaining_invitations
FROM team_challenge_invitations
WHERE invited_by = (
  SELECT id FROM users 
  WHERE email LIKE '%adam%' OR display_name LIKE '%adam%'
  ORDER BY created_at DESC
  LIMIT 1
);
