-- Check for duplicate XP awards for the same challenge
SELECT 
  source_id as challenge_id,
  user_id,
  xp_amount,
  description,
  created_at,
  COUNT(*) as award_count
FROM xp_history
WHERE source_type = 'challenge'
  AND source_id IS NOT NULL
GROUP BY source_id, user_id, xp_amount, description, created_at
HAVING COUNT(*) > 1
ORDER BY created_at DESC;

-- Also show all XP awards for challenges in last 7 days
SELECT 
  id,
  user_id,
  xp_amount,
  source_type,
  source_id as challenge_id,
  description,
  created_at
FROM xp_history
WHERE source_type = 'challenge'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 50;
