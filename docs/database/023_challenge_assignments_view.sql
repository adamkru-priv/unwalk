-- ============================================
-- Add VIEW for received challenge assignments
-- ============================================

-- View: My received challenge assignments
CREATE OR REPLACE VIEW my_received_challenges AS
SELECT 
  ca.id,
  ca.sender_id,
  sender.display_name as sender_name,
  sender.avatar_url as sender_avatar,
  ca.admin_challenge_id,
  ac.title as challenge_title,
  ac.goal_steps as challenge_goal_steps,
  ac.image_url as challenge_image_url,
  ca.message,
  ca.status,
  ca.sent_at,
  ca.responded_at
FROM challenge_assignments ca
JOIN public.users sender ON ca.sender_id = sender.id
JOIN admin_challenges ac ON ca.admin_challenge_id = ac.id
WHERE ca.recipient_id = auth.uid()
  AND ca.status = 'pending'
ORDER BY ca.sent_at DESC;

-- View: My sent challenge assignments
CREATE OR REPLACE VIEW my_sent_challenges AS
SELECT 
  ca.id,
  ca.recipient_id,
  recipient.display_name as recipient_name,
  recipient.avatar_url as recipient_avatar,
  ca.admin_challenge_id,
  ac.title as challenge_title,
  ac.goal_steps as challenge_goal_steps,
  ac.image_url as challenge_image_url,
  ca.message,
  ca.status,
  ca.sent_at,
  ca.responded_at
FROM challenge_assignments ca
JOIN public.users recipient ON ca.recipient_id = recipient.id
JOIN admin_challenges ac ON ca.admin_challenge_id = ac.id
WHERE ca.sender_id = auth.uid()
ORDER BY ca.sent_at DESC;

COMMENT ON VIEW my_received_challenges IS 'Shows pending challenge assignments received by current user';
COMMENT ON VIEW my_sent_challenges IS 'Shows all challenge assignments sent by current user';
