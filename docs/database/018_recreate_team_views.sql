-- Recreate team views after fixing team_members schema

-- View: My team
CREATE OR REPLACE VIEW my_team AS
SELECT 
  tm.id,
  tm.member_id,
  u.email,
  u.display_name,
  u.avatar_url,
  u.tier,
  tm.added_at,
  (SELECT COUNT(*) FROM user_challenges uc 
   WHERE uc.user_id = tm.member_id AND uc.status = 'active') as active_challenges_count
FROM team_members tm
JOIN public.users u ON tm.member_id = u.id
WHERE tm.user_id = auth.uid();

-- View: Sent invitations
CREATE OR REPLACE VIEW my_sent_invitations AS
SELECT 
  ti.id,
  ti.recipient_email,
  ti.recipient_id,
  u.display_name as recipient_name,
  u.avatar_url as recipient_avatar,
  ti.status,
  ti.message,
  ti.invited_at,
  ti.expires_at
FROM team_invitations ti
LEFT JOIN public.users u ON ti.recipient_id = u.id
WHERE ti.sender_id = auth.uid()
ORDER BY ti.invited_at DESC;

-- View: Received invitations
CREATE OR REPLACE VIEW my_received_invitations AS
SELECT 
  ti.id,
  ti.sender_id,
  u.email as sender_email,
  u.display_name as sender_name,
  u.avatar_url as sender_avatar,
  ti.status,
  ti.message,
  ti.invited_at,
  ti.expires_at
FROM team_invitations ti
JOIN public.users u ON ti.sender_id = u.id
WHERE ti.recipient_id = auth.uid()
  OR ti.recipient_email = (SELECT email FROM public.users WHERE id = auth.uid())
ORDER BY ti.invited_at DESC;

-- Grant permissions
GRANT SELECT ON my_team TO authenticated;
GRANT SELECT ON my_sent_invitations TO authenticated;
GRANT SELECT ON my_received_invitations TO authenticated;

-- Comments
COMMENT ON VIEW my_team IS 'Current user team members with challenge counts';
COMMENT ON VIEW my_sent_invitations IS 'Team invitations sent by current user';
COMMENT ON VIEW my_received_invitations IS 'Team invitations received by current user';
