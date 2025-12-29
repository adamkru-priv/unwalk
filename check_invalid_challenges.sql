-- Check for invalid completed challenges (0 steps or invalid dates)

SELECT 
  uc.id,
  uc.current_steps,
  uc.status,
  uc.started_at,
  uc.completed_at,
  uc.claimed_at,
  ac.title as challenge_title,
  ac.goal_steps,
  u.email
FROM user_challenges uc
LEFT JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
LEFT JOIN users u ON uc.user_id = u.id
WHERE 
  uc.status IN ('completed', 'claimed')
  AND (
    uc.current_steps = 0 
    OR uc.completed_at IS NULL
    OR uc.started_at IS NULL
  )
ORDER BY uc.completed_at DESC NULLS LAST;
