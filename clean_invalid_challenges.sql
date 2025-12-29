-- Clean up invalid completed challenges
-- These are challenges with 0 steps or missing dates that shouldn't be in history

BEGIN;

-- Step 1: Show what will be deleted (for safety)
SELECT 
  uc.id,
  uc.current_steps,
  uc.status,
  uc.completed_at,
  ac.title as challenge_title,
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
  );

-- Step 2: Delete invalid challenges
-- Uncomment the line below after reviewing the results above
-- DELETE FROM user_challenges
-- WHERE 
--   status IN ('completed', 'claimed')
--   AND (
--     current_steps = 0 
--     OR completed_at IS NULL
--     OR started_at IS NULL
--   );

ROLLBACK; -- Change to COMMIT after verifying the SELECT results
