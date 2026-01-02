-- ============================================
-- FIX: Badge'e i XP dla nieukończonych challenge'ów
-- ============================================
-- Problem: System nalicza badge'e i XP dla challenge'ów zakończonych przed 100%
-- 
-- Fix: 
-- 1. Dodaj kolumnę is_fully_completed do user_challenges
-- 2. Zaktualizuj funkcje badge'ów aby liczyły tylko fully completed
-- 3. System będzie ustawiał is_fully_completed=true tylko gdy current_steps >= goal_steps
-- ============================================

BEGIN;

-- ============================================
-- 1. Dodaj kolumnę is_fully_completed do user_challenges
-- ============================================
ALTER TABLE public.user_challenges
ADD COLUMN IF NOT EXISTS is_fully_completed BOOLEAN DEFAULT false;

-- Zaktualizuj istniejące rekordy: is_fully_completed = true jeśli current_steps >= goal_steps
UPDATE public.user_challenges uc
SET is_fully_completed = true
FROM admin_challenges ac
WHERE uc.admin_challenge_id = ac.id
  AND uc.status = 'completed'
  AND uc.current_steps >= ac.goal_steps;

-- Dodaj indeks dla szybszego filtrowania
CREATE INDEX IF NOT EXISTS idx_user_challenges_fully_completed 
ON public.user_challenges(user_id, is_fully_completed) 
WHERE is_fully_completed = true;

COMMENT ON COLUMN public.user_challenges.is_fully_completed IS 
  'TRUE only when challenge reached 100% (current_steps >= goal_steps). FALSE for manually ended challenges.';

-- ============================================
-- 2. Utwórz trigger który automatycznie ustawi is_fully_completed
-- ============================================
CREATE OR REPLACE FUNCTION set_is_fully_completed()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_goal_steps INT;
BEGIN
  -- Pobierz goal_steps z admin_challenges
  SELECT goal_steps INTO v_goal_steps
  FROM admin_challenges
  WHERE id = NEW.admin_challenge_id;

  -- Ustaw is_fully_completed jeśli current_steps >= goal_steps
  IF v_goal_steps IS NOT NULL AND v_goal_steps > 0 THEN
    IF NEW.current_steps >= v_goal_steps THEN
      NEW.is_fully_completed := true;
    ELSE
      NEW.is_fully_completed := false;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_is_fully_completed ON public.user_challenges;

CREATE TRIGGER trg_set_is_fully_completed
  BEFORE INSERT OR UPDATE OF current_steps, status ON public.user_challenges
  FOR EACH ROW
  EXECUTE FUNCTION set_is_fully_completed();

-- ============================================
-- 3. Zaktualizuj funkcję get_user_achievement_stats
-- ============================================
-- Teraz liczy tylko challenge'e z is_fully_completed = true
CREATE OR REPLACE FUNCTION get_user_achievement_stats(p_user_id UUID)
RETURNS TABLE(
  total_completed INTEGER,
  total_distance_meters INTEGER,
  current_streak_days INTEGER,
  active_days_this_month INTEGER,
  team_challenges_completed INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- ✅ FIX: Total FULLY completed challenges (is_fully_completed = true)
    (SELECT COUNT(*)::INTEGER 
     FROM user_challenges 
     WHERE user_id = p_user_id 
     AND status = 'completed' 
     AND is_fully_completed = true) as total_completed,
    
    -- ✅ FIX: Total distance walked (sum of FULLY completed challenges only)
    (SELECT COALESCE(SUM(ac.goal_steps), 0)::INTEGER 
     FROM user_challenges uc 
     JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
     WHERE uc.user_id = p_user_id 
     AND uc.status = 'completed' 
     AND uc.is_fully_completed = true) as total_distance_meters,
    
    -- Current streak (simplified - TODO: improve with real streak tracking)
    (SELECT 0::INTEGER) as current_streak_days,
    
    -- Active days this month (unchanged - doesn't matter if completed or not)
    (SELECT COUNT(DISTINCT DATE(started_at))::INTEGER 
     FROM user_challenges 
     WHERE user_id = p_user_id 
     AND started_at >= date_trunc('month', NOW())
     AND status IN ('active', 'completed')) as active_days_this_month,
    
    -- ✅ FIX: Team challenges FULLY completed
    (SELECT COUNT(*)::INTEGER 
     FROM user_challenges 
     WHERE user_id = p_user_id 
     AND assigned_by IS NOT NULL 
     AND status = 'completed'
     AND is_fully_completed = true) as team_challenges_completed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. Zaktualizuj trigger_check_achievements
-- ============================================
-- Sprawdzaj achievementy tylko gdy is_fully_completed = true
CREATE OR REPLACE FUNCTION trigger_check_achievements()
RETURNS TRIGGER AS $$
BEGIN
  -- ✅ FIX: Sprawdzaj achievementy TYLKO gdy challenge został FULLY completed (100%)
  IF NEW.status = 'completed' 
     AND NEW.is_fully_completed = true 
     AND (OLD.status IS NULL OR OLD.status != 'completed' OR OLD.is_fully_completed = false) THEN
    PERFORM check_and_unlock_achievements(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger już istnieje, ale upewnijmy się że jest aktywny
DROP TRIGGER IF EXISTS check_achievements_on_completion ON user_challenges;
CREATE TRIGGER check_achievements_on_completion
  AFTER INSERT OR UPDATE ON user_challenges
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_achievements();

-- ============================================
-- 5. Dodaj view dla łatwego debugowania
-- ============================================
CREATE OR REPLACE VIEW user_challenges_completion_status AS
SELECT 
  uc.id,
  uc.user_id,
  uc.admin_challenge_id,
  ac.title as challenge_title,
  uc.current_steps,
  ac.goal_steps,
  uc.status,
  uc.is_fully_completed,
  CASE 
    WHEN ac.goal_steps > 0 THEN ROUND((uc.current_steps::NUMERIC / ac.goal_steps::NUMERIC) * 100, 2)
    ELSE 0
  END as completion_percentage,
  uc.completed_at,
  uc.claimed_at
FROM user_challenges uc
JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
WHERE uc.status IN ('completed', 'claimed')
ORDER BY uc.completed_at DESC;

COMMENT ON VIEW user_challenges_completion_status IS 
  'Shows completion status of challenges with percentage and is_fully_completed flag';

COMMIT;

-- ============================================
-- Podsumowanie zmian
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Naprawiono naliczanie badge''ów i XP dla nieukończonych challenge''ów!';
  RAISE NOTICE '';
  RAISE NOTICE 'Zmiany:';
  RAISE NOTICE '  ✓ Dodano kolumnę is_fully_completed do user_challenges';
  RAISE NOTICE '  ✓ Trigger automatycznie ustawia is_fully_completed gdy current_steps >= goal_steps';
  RAISE NOTICE '  ✓ Funkcja get_user_achievement_stats liczy tylko fully completed challenges';
  RAISE NOTICE '  ✓ Trigger check_achievements sprawdza tylko fully completed challenges';
  RAISE NOTICE '  ✓ Zaktualizowano istniejące rekordy w bazie';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  UWAGA dla frontendu:';
  RAISE NOTICE '  • Funkcja claimCompletedChallenge() w api.ts powinna sprawdzać is_fully_completed';
  RAISE NOTICE '  • XP powinno być naliczane tylko gdy is_fully_completed = true';
  RAISE NOTICE '  • Powiadomienia już naprawione w poprzedniej migracji';
END $$;
