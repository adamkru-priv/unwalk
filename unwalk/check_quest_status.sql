-- Check current quest status for debugging
SELECT 
  id,
  quest_type,
  target_value,
  current_progress,
  completed,
  claimed,
  completed_at,
  claimed_at,
  created_at
FROM daily_quests
WHERE quest_date = CURRENT_DATE
ORDER BY created_at DESC
LIMIT 5;
