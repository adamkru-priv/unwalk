-- Check today's quest details
SELECT 
  id,
  user_id,
  quest_date,
  quest_type,
  target_value,
  current_progress,
  xp_reward,
  completed,
  claimed,
  completed_at,
  claimed_at,
  created_at
FROM public.daily_quests
WHERE quest_date = CURRENT_DATE
ORDER BY created_at DESC
LIMIT 5;
