-- Fix: Resolve ambiguous column reference in claim_quest_reward
-- Use proper aliasing for function return values

CREATE OR REPLACE FUNCTION claim_quest_reward(p_quest_id UUID, p_user_id UUID)
RETURNS TABLE(xp_earned INTEGER, new_total_xp INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  v_xp_reward INTEGER;
  v_quest_type TEXT;
  v_result RECORD;
BEGIN
  -- Get quest details
  SELECT xp_reward, quest_type INTO v_xp_reward, v_quest_type
  FROM public.daily_quests
  WHERE id = p_quest_id AND user_id = p_user_id AND completed = TRUE AND claimed = FALSE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quest not found or already claimed';
  END IF;
  
  -- Mark as claimed
  UPDATE public.daily_quests
  SET claimed = TRUE,
      claimed_at = NOW()
  WHERE id = p_quest_id;
  
  -- Add XP to user
  SELECT new_xp, new_level, leveled_up INTO v_result
  FROM add_xp_to_user(
    p_user_id,
    v_xp_reward,
    'daily_quest',
    p_quest_id,
    format('Daily Quest: %s', v_quest_type)
  );
  
  -- Update streak (ignore return value to avoid ambiguity)
  PERFORM update_user_streak(p_user_id);
  
  -- Return XP info
  RETURN QUERY SELECT v_xp_reward, v_result.new_xp;
END;
$$;
