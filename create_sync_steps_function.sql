-- ========================================
-- sync_steps: Native iOS background sync
-- ========================================
-- This function is called by iOS HealthKit plugin
-- when steps change in background (app closed)
-- ========================================

CREATE OR REPLACE FUNCTION sync_steps(
  p_user_id UUID,
  p_device_id TEXT,
  p_date DATE,
  p_steps INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_steps INTEGER;
  v_existing_id UUID;
  v_daily_goal INTEGER;
  v_solo_challenge_id UUID;
  v_solo_challenge_steps INTEGER;
  v_solo_challenge_goal INTEGER;
  v_result JSON;
BEGIN
  -- Log the sync attempt
  RAISE NOTICE 'sync_steps called: user_id=%, device_id=%, date=%, steps=%', 
    p_user_id, p_device_id, p_date, p_steps;

  -- Get user's daily goal
  SELECT daily_step_goal INTO v_daily_goal
  FROM users
  WHERE id = p_user_id;

  IF v_daily_goal IS NULL THEN
    v_daily_goal := 10000;
  END IF;

  -- Check if record exists for this date
  SELECT id, steps INTO v_existing_id, v_existing_steps
  FROM daily_steps
  WHERE user_id = p_user_id 
    AND date = p_date
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing record if new steps are higher
    IF p_steps > v_existing_steps THEN
      UPDATE daily_steps
      SET 
        steps = p_steps,
        updated_at = NOW()
      WHERE id = v_existing_id;
      
      RAISE NOTICE 'Updated existing record: % steps (was %)', p_steps, v_existing_steps;
    ELSE
      RAISE NOTICE 'Skipped update: existing steps % >= new steps %', v_existing_steps, p_steps;
    END IF;
  ELSE
    -- Insert new record
    INSERT INTO daily_steps (user_id, device_id, date, steps)
    VALUES (p_user_id, p_device_id, p_date, p_steps);
    
    RAISE NOTICE 'Inserted new record: % steps', p_steps;
  END IF;

  -- Update active solo challenge progress (if exists)
  SELECT c.id, c.goal_steps, c.current_steps
  INTO v_solo_challenge_id, v_solo_challenge_goal, v_solo_challenge_steps
  FROM challenges c
  WHERE c.user_id = p_user_id
    AND c.status = 'active'
    AND c.challenge_type = 'solo'
    AND c.started_at IS NOT NULL
  ORDER BY c.started_at DESC
  LIMIT 1;

  IF v_solo_challenge_id IS NOT NULL THEN
    -- Calculate steps since challenge started
    DECLARE
      v_steps_since_start INTEGER;
    BEGIN
      SELECT COALESCE(SUM(ds.steps), 0)
      INTO v_steps_since_start
      FROM daily_steps ds
      INNER JOIN challenges ch ON ch.id = v_solo_challenge_id
      WHERE ds.user_id = p_user_id
        AND ds.date >= DATE(ch.started_at);

      -- Update challenge progress
      UPDATE challenges
      SET 
        current_steps = v_steps_since_start,
        updated_at = NOW()
      WHERE id = v_solo_challenge_id;

      RAISE NOTICE 'Updated solo challenge: % / % steps', v_steps_since_start, v_solo_challenge_goal;

      -- Check if challenge completed
      IF v_steps_since_start >= v_solo_challenge_goal AND v_solo_challenge_steps < v_solo_challenge_goal THEN
        UPDATE challenges
        SET 
          status = 'completed',
          completed_at = NOW(),
          updated_at = NOW()
        WHERE id = v_solo_challenge_id;

        RAISE NOTICE 'Solo challenge COMPLETED! 🎉';
      END IF;
    END;
  END IF;

  -- Return success response
  v_result := json_build_object(
    'success', true,
    'steps', p_steps,
    'daily_goal', v_daily_goal,
    'challenge_updated', v_solo_challenge_id IS NOT NULL
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'sync_steps error: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION sync_steps(UUID, TEXT, DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_steps(UUID, TEXT, DATE, INTEGER) TO anon;

-- Add comment
COMMENT ON FUNCTION sync_steps IS 'Sync steps from iOS HealthKit background delivery. Called when app is closed and new steps are detected.';
