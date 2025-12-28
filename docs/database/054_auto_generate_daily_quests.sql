-- ============================================
-- MOVEE: Auto-generate Daily Quests
-- Migration 054
-- ============================================
-- Tworzy funkcję do automatycznego generowania daily questów
-- Quest jest tworzony przy pierwszym zalogowaniu użytkownika danego dnia

BEGIN;

-- ✅ FIX: Drop existing function first
DROP FUNCTION IF EXISTS generate_daily_quest(UUID);

-- 1. Funkcja do generowania questu dla użytkownika
CREATE OR REPLACE FUNCTION generate_daily_quest(p_user_id UUID)
RETURNS daily_quests
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quest daily_quests;
  v_quest_type TEXT;
  v_target_value INTEGER;
  v_xp_reward INTEGER;
  v_random FLOAT;
BEGIN
  -- Sprawdź czy użytkownik już ma quest na dzisiaj
  SELECT * INTO v_quest
  FROM daily_quests
  WHERE user_id = p_user_id
    AND quest_date = CURRENT_DATE;
  
  IF FOUND THEN
    RETURN v_quest;
  END IF;
  
  -- Losuj typ questu (70% steps, 30% social)
  v_random := random();
  
  IF v_random < 0.7 THEN
    -- Quest: Przejdź X kroków (3000-8000 kroków)
    v_quest_type := 'steps';
    v_target_value := 3000 + (random() * 5000)::INTEGER;
    v_target_value := (v_target_value / 500) * 500; -- Zaokrąglij do 500
    
    -- XP w zależności od trudności
    v_xp_reward := CASE
      WHEN v_target_value <= 4000 THEN 30
      WHEN v_target_value <= 5000 THEN 50
      WHEN v_target_value <= 6000 THEN 70
      ELSE 100
    END;
  ELSE
    -- Quest: Wyślij challenge do kogoś z zespołu
    v_quest_type := 'social';
    v_target_value := 1;
    v_xp_reward := 75;
  END IF;
  
  -- Utwórz quest
  INSERT INTO daily_quests (
    id,
    user_id,
    quest_date,
    quest_type,
    target_value,
    current_progress,
    xp_reward,
    completed,
    claimed,
    created_at
  )
  VALUES (
    gen_random_uuid(),
    p_user_id,
    CURRENT_DATE,
    v_quest_type,
    v_target_value,
    0,
    v_xp_reward,
    false,
    false,
    NOW()
  )
  RETURNING * INTO v_quest;
  
  RETURN v_quest;
END;
$$;

-- 2. Funkcja wywoływana przy każdym pobraniu stats użytkownika
-- Automatycznie tworzy quest jeśli go nie ma
CREATE OR REPLACE FUNCTION ensure_daily_quest_exists()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Pobierz user_id z auth context
  v_user_id := auth.uid();
  
  -- Jeśli użytkownik jest zalogowany i nie jest guestem
  IF v_user_id IS NOT NULL THEN
    -- Sprawdź czy user nie jest guestem
    IF EXISTS (
      SELECT 1 FROM users 
      WHERE id = v_user_id 
        AND is_guest = false
    ) THEN
      -- Wygeneruj quest jeśli nie istnieje
      PERFORM generate_daily_quest(v_user_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Usuń stary trigger jeśli istnieje
DROP TRIGGER IF EXISTS ensure_daily_quest_on_activity ON users;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION generate_daily_quest(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_daily_quest_exists() TO authenticated;

COMMIT;

-- ============================================
-- Podsumowanie
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Auto-generate Daily Quests system created!';
  RAISE NOTICE '';
  RAISE NOTICE 'System will automatically create daily quests when user:';
  RAISE NOTICE '  - Logs in (authenticated users only)';
  RAISE NOTICE '  - Opens the app';
  RAISE NOTICE '  - First time each day';
  RAISE NOTICE '';
  RAISE NOTICE 'Quest types:';
  RAISE NOTICE '  - Steps: Walk 3,000-8,000 steps (30-100 XP)';
  RAISE NOTICE '  - Social: Send 1 challenge (75 XP)';
END $$;