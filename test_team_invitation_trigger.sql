-- Test if trigger is working by checking existing invitations
SELECT 
  'Checking if trigger exists...' as step;

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_team_challenge_invitation_created';

-- Check if there are any recent invitations
SELECT 
  'Recent team challenge invitations:' as step;

SELECT 
  tci.id,
  tci.invited_user,
  tci.invited_by,
  tci.status,
  tci.invited_at,
  u_sender.display_name as sender_name,
  u_invited.display_name as invited_user_name,
  ac.title as challenge_title
FROM team_challenge_invitations tci
LEFT JOIN users u_sender ON u_sender.id = tci.invited_by
LEFT JOIN users u_invited ON u_invited.id = tci.invited_user
LEFT JOIN admin_challenges ac ON ac.id = tci.challenge_id
ORDER BY tci.invited_at DESC
LIMIT 5;

-- Check if push notifications were created for these invitations
SELECT 
  'Push notifications for invitations:' as step;

SELECT 
  po.id,
  po.user_id,
  po.type,
  po.title,
  po.body,
  po.status,
  po.created_at,
  u.display_name as user_name
FROM push_outbox po
LEFT JOIN users u ON u.id = po.user_id
WHERE po.type = 'team_challenge_invitation'
ORDER BY po.created_at DESC
LIMIT 5;
