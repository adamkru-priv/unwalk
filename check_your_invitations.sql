-- Check YOUR pending invitations (as host)
SELECT 
  ti.id,
  ti.status,
  ti.invited_at,
  ti.challenge_id,
  ti.invited_by,
  ti.invited_user,
  u.display_name as invited_user_name
FROM team_invitations ti
LEFT JOIN users u ON u.id = ti.invited_user
WHERE ti.invited_by = '6c9264fc-91d4-41c8-b08f-91e175c80853'
ORDER BY ti.invited_at DESC;

-- Check if you are INVITED by someone else
SELECT 
  ti.id,
  ti.status,
  ti.invited_at,
  ti.challenge_id,
  ti.invited_by,
  ti.invited_user,
  host.display_name as host_name
FROM team_invitations ti
LEFT JOIN users host ON host.id = ti.invited_by
WHERE ti.invited_user = '6c9264fc-91d4-41c8-b08f-91e175c80853'
ORDER BY ti.invited_at DESC;
