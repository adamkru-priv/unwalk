-- Check challenge assignments statuses for debugging
SELECT 
  ca.id,
  ca.status as assignment_status,
  ca.sender_id,
  sender.display_name as sender_name,
  ca.recipient_id,
  recipient.display_name as recipient_name,
  ac.title as challenge_title,
  ca.user_challenge_id,
  uc.status as user_challenge_status,
  uc.current_steps,
  ac.goal_steps,
  uc.started_at,
  uc.completed_at,
  CASE 
    WHEN uc.current_steps IS NOT NULL AND ac.goal_steps > 0 
    THEN ROUND((uc.current_steps::numeric / ac.goal_steps::numeric) * 100, 0)
    ELSE 0 
  END as progress_percent
FROM challenge_assignments ca
LEFT JOIN users sender ON ca.sender_id = sender.id
LEFT JOIN users recipient ON ca.recipient_id = recipient.id
LEFT JOIN admin_challenges ac ON ca.admin_challenge_id = ac.id
LEFT JOIN user_challenges uc ON ca.user_challenge_id = uc.id
WHERE ca.sender_id IN (
  SELECT id FROM users WHERE display_name IN ('Adam', 'Ewelina', 'Test')
) OR ca.recipient_id IN (
  SELECT id FROM users WHERE display_name IN ('Adam', 'Ewelina', 'Test')
)
ORDER BY ca.sent_at DESC
LIMIT 20;
