-- ============================================
-- MOVEE: Gamification MVP - XP, Levels, Daily Quests, Streaks
-- ============================================

-- 1. Add XP and Level columns to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0 CHECK (xp >= 0),
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 50),
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0 CHECK (current_streak >= 0),
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0 CHECK (longest_streak >= 0),
ADD COLUMN IF NOT EXISTS last_activity_date DATE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_level ON public.users(level DESC, xp DESC);
CREATE INDEX IF NOT EXISTS idx_users_streak ON public.users(current_streak DESC);

-- 2. Create daily_quests table
CREATE TABLE IF NOT EXISTS public.daily_quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  quest_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quest_type TEXT NOT NULL CHECK (quest_type IN ('steps', 'challenge_progress', 'social')),
  target_value INTEGER NOT NULL,
  current_progress INTEGER DEFAULT 0,
  xp_reward INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  claimed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, quest_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_quests_user_date ON public.daily_quests(user_id, quest_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_quests_unclaimed ON public.daily_quests(user_id, quest_date) WHERE completed = TRUE AND claimed = FALSE;

-- 3. Create xp_transactions table (for tracking XP history)
CREATE TABLE IF NOT EXISTS public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  xp_amount INTEGER NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('challenge', 'daily_quest', 'streak_bonus', 'badge', 'milestone', 'manual')),
  source_id UUID, -- Reference to challenge, quest, badge, etc.
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON public.xp_transactions(user_id, created_at DESC);

-- 4. Function to calculate required XP for level
CREATE OR REPLACE FUNCTION calculate_xp_for_level(target_level INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Exponential growth: Level N requires 100 * (1.5 ^ (N-1)) total XP
  -- Level 1: 0 XP
  -- Level 2: 100 XP
  -- Level 3: 250 XP (100 + 150)
  -- Level 4: 475 XP (250 + 225)
  -- etc.
  IF target_level <= 1 THEN
    RETURN 0;
  END IF;
  
  RETURN FLOOR(100 * (POWER(1.5, target_level - 1) - 1) / 0.5);
END;
$$;

-- 5. Function to add XP to user (with level-up logic)
CREATE OR REPLACE FUNCTION add_xp_to_user(
  p_user_id UUID,
  p_xp_amount INTEGER,
  p_source_type TEXT,
  p_source_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE(new_xp INTEGER, new_level INTEGER, leveled_up BOOLEAN)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_xp INTEGER;
  v_current_level INTEGER;
  v_new_xp INTEGER;
  v_new_level INTEGER;
  v_required_xp INTEGER;
  v_leveled_up BOOLEAN := FALSE;
BEGIN
  -- Get current XP and level
  SELECT xp, level INTO v_current_xp, v_current_level
  FROM public.users
  WHERE id = p_user_id;
  
  -- Calculate new XP
  v_new_xp := v_current_xp + p_xp_amount;
  v_new_level := v_current_level;
  
  -- Check for level up
  LOOP
    v_required_xp := calculate_xp_for_level(v_new_level + 1);
    EXIT WHEN v_new_xp < v_required_xp OR v_new_level >= 50;
    
    v_new_level := v_new_level + 1;
    v_leveled_up := TRUE;
  END LOOP;
  
  -- Update user
  UPDATE public.users
  SET xp = v_new_xp,
      level = v_new_level,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Record transaction
  INSERT INTO public.xp_transactions (user_id, xp_amount, source_type, source_id, description)
  VALUES (p_user_id, p_xp_amount, p_source_type, p_source_id, p_description);
  
  RETURN QUERY SELECT v_new_xp, v_new_level, v_leveled_up;
END;
$$;

-- 6. Function to update streak
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS TABLE(current_streak INTEGER, streak_bonus_xp INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  v_last_activity DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_new_streak INTEGER;
  v_bonus_xp INTEGER := 0;
BEGIN
  -- Get current streak data
  SELECT last_activity_date, current_streak, longest_streak
  INTO v_last_activity, v_current_streak, v_longest_streak
  FROM public.users
  WHERE id = p_user_id;
  
  -- Calculate new streak
  IF v_last_activity IS NULL OR v_last_activity < CURRENT_DATE - INTERVAL '1 day' THEN
    -- Streak broken or first activity
    v_new_streak := 1;
  ELSIF v_last_activity = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Continue streak
    v_new_streak := v_current_streak + 1;
    
    -- Award streak bonuses at milestones
    IF v_new_streak = 3 THEN
      v_bonus_xp := 50;
    ELSIF v_new_streak = 7 THEN
      v_bonus_xp := 150;
    ELSIF v_new_streak = 14 THEN
      v_bonus_xp := 300;
    ELSIF v_new_streak = 30 THEN
      v_bonus_xp := 1000;
    ELSIF v_new_streak % 7 = 0 THEN
      -- Every 7 days after 30
      v_bonus_xp := 100;
    END IF;
  ELSE
    -- Already counted today
    v_new_streak := v_current_streak;
  END IF;
  
  -- Update user
  UPDATE public.users
  SET current_streak = v_new_streak,
      longest_streak = GREATEST(v_longest_streak, v_new_streak),
      last_activity_date = CURRENT_DATE,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Add streak bonus XP if any
  IF v_bonus_xp > 0 THEN
    PERFORM add_xp_to_user(
      p_user_id,
      v_bonus_xp,
      'streak_bonus',
      NULL,
      format('Streak bonus: %s days', v_new_streak)
    );
  END IF;
  
  RETURN QUERY SELECT v_new_streak, v_bonus_xp;
END;
$$;

-- 7. Function to generate daily quest
CREATE OR REPLACE FUNCTION generate_daily_quest(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_quest_id UUID;
  v_quest_type TEXT;
  v_target INTEGER;
  v_xp_reward INTEGER;
  v_random INTEGER;
BEGIN
  -- Check if quest already exists for today
  SELECT id INTO v_quest_id
  FROM public.daily_quests
  WHERE user_id = p_user_id AND quest_date = CURRENT_DATE;
  
  IF v_quest_id IS NOT NULL THEN
    RETURN v_quest_id;
  END IF;
  
  -- Generate random quest
  v_random := floor(random() * 3);
  
  IF v_random = 0 THEN
    -- Steps quest
    v_quest_type := 'steps';
    v_target := 3000 + floor(random() * 5000); -- 3k-8k steps
    v_xp_reward := 50;
  ELSIF v_random = 1 THEN
    -- Challenge progress quest
    v_quest_type := 'challenge_progress';
    v_target := 10 + floor(random() * 20); -- 10-30% progress
    v_xp_reward := 100;
  ELSE
    -- Social quest
    v_quest_type := 'social';
    v_target := 1;
    v_xp_reward := 75;
  END IF;
  
  -- Create quest
  INSERT INTO public.daily_quests (user_id, quest_date, quest_type, target_value, xp_reward)
  VALUES (p_user_id, CURRENT_DATE, v_quest_type, v_target, v_xp_reward)
  RETURNING id INTO v_quest_id;
  
  RETURN v_quest_id;
END;
$$;

-- 8. Function to check and complete quest
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
  
  -- Update progress
  UPDATE public.daily_quests
  SET current_progress = p_current_progress,
      updated_at = NOW()
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

-- 9. Function to claim quest reward
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
  SELECT * INTO v_result
  FROM add_xp_to_user(
    p_user_id,
    v_xp_reward,
    'daily_quest',
    p_quest_id,
    format('Daily Quest: %s', v_quest_type)
  );
  
  -- Update streak
  PERFORM update_user_streak(p_user_id);
  
  RETURN QUERY SELECT v_xp_reward, v_result.new_xp;
END;
$$;

-- 10. Comments
COMMENT ON COLUMN public.users.xp IS 'Total experience points earned';
COMMENT ON COLUMN public.users.level IS 'Current level (1-50)';
COMMENT ON COLUMN public.users.current_streak IS 'Current consecutive days with activity';
COMMENT ON COLUMN public.users.longest_streak IS 'Longest streak ever achieved';
COMMENT ON COLUMN public.users.last_activity_date IS 'Date of last activity (for streak tracking)';

COMMENT ON TABLE public.daily_quests IS 'Daily quests for users';
COMMENT ON TABLE public.xp_transactions IS 'XP transaction history';

-- 11. RLS Policies
ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quests"
  ON public.daily_quests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quests"
  ON public.daily_quests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quests"
  ON public.daily_quests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own XP transactions"
  ON public.xp_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own XP transactions"
  ON public.xp_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role can manage quests"
  ON public.daily_quests FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage xp_transactions"
  ON public.xp_transactions FOR ALL
  USING (auth.role() = 'service_role');

