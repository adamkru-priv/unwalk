-- ============================================
-- Create VIEW for challenge assignments with progress
-- ============================================

CREATE OR REPLACE VIEW challenge_assignments_with_progress AS
SELECT 
  ca.id,
  ca.sender_id,
  ca.recipient_id,
  sender.display_name as sender_name,
  sender.avatar_url as sender_avatar,
  recipient.display_name as recipient_name,
  recipient.avatar_url as recipient_avatar,
  ca.admin_challenge_id,
  ac.title as challenge_title,
  ac.goal_steps as challenge_goal_steps,
  ac.image_url as challenge_image_url,
  ca.message,
  ca.status,
  ca.sent_at,
  ca.responded_at,
  -- User challenge info (if started)
  uc.id as user_challenge_id,
  uc.status as user_challenge_status,
  uc.current_steps,
  uc.started_at as user_challenge_started_at,
  uc.completed_at as user_challenge_completed_at
FROM challenge_assignments ca
JOIN public.users sender ON ca.sender_id = sender.id
JOIN public.users recipient ON ca.recipient_id = recipient.id
JOIN admin_challenges ac ON ca.admin_challenge_id = ac.id
LEFT JOIN user_challenges uc ON 
  ca.user_challenge_id = uc.id
ORDER BY ca.sent_at DESC;

-- Grant access to authenticated users
GRANT SELECT ON challenge_assignments_with_progress TO authenticated;

COMMENT ON VIEW challenge_assignments_with_progress IS 'Shows all challenge assignments with progress information from user_challenges table';
