-- Fix: Remove updated_at from check_and_complete_quest function
-- The daily_quests table doesn't have updated_at column

CREATE OR REPLACE FUNCTION check_and_complete_quest(
  p_user_id UUID,
  p_quest_id UUID,
  p_current_progress INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_target INTEGER;
  v_xp_reward INTEGER;
  v_completed BOOLEAN;
BEGIN
  -- Get quest details
  SELECT target_value, xp_reward, completed
  INTO v_target, v_xp_reward, v_completed
  FROM public.daily_quests
  WHERE id = p_quest_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update progress (removed updated_at - column doesn't exist)
  UPDATE public.daily_quests
  SET current_progress = p_current_progress
  WHERE id = p_quest_id;
  
  -- Check if completed
  IF NOT v_completed AND p_current_progress >= v_target THEN
    UPDATE public.daily_quests
    SET completed = TRUE,
        completed_at = NOW()
    WHERE id = p_quest_id;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;
