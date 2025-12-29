-- Fix quests that are marked as completed but shouldn't be
-- This happens when frontend incorrectly marked them as completed

UPDATE public.daily_quests
SET 
  completed = FALSE,
  completed_at = NULL
WHERE 
  completed = TRUE 
  AND claimed = FALSE
  AND current_progress < target_value
  AND quest_date = CURRENT_DATE;

-- Show affected quests
SELECT 
  user_id,
  quest_type,
  target_value,
  current_progress,
  completed,
  claimed,
  (current_progress::FLOAT / target_value * 100)::INT as progress_percent
FROM public.daily_quests
WHERE quest_date = CURRENT_DATE
ORDER BY user_id;
