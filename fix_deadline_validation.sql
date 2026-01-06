-- ============================================
-- FIX: Challenge deadline validation
-- ============================================
-- Problem 1: Kroki naliczane po deadline
-- Problem 2: Powiadomienia "Congratulations" po wygaśnięciu challenge
-- Problem 3: Nagrody dostępne mimo upływu czasu
-- ============================================

BEGIN;

-- ============================================
-- 1. Napraw funkcję powiadomień - dodaj sprawdzanie deadline
-- ============================================
CREATE OR REPLACE FUNCTION public.enqueue_challenge_completed_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_goal_steps INT;
  v_old_percent INT;
  v_new_percent INT;
  v_platform_record RECORD;
  v_push_enabled BOOLEAN;
  v_deadline TIMESTAMPTZ;
  v_is_expired BOOLEAN := false;
BEGIN
  -- Sprawdź czy user ma włączone powiadomienia
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(u.push_enabled, true) INTO v_push_enabled
  FROM public.users u
  WHERE u.id = NEW.user_id;

  IF NOT v_push_enabled THEN
    RETURN NEW;
  END IF;

  -- Pobierz dane challenge'u WRAZ Z DEADLINE
  SELECT COALESCE(ac.title, 'Challenge'), ac.goal_steps, ac.deadline
  INTO v_title, v_goal_steps, v_deadline
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  -- Jeśli brak goal_steps, nie wysyłaj powiadomienia
  IF v_goal_steps IS NULL OR v_goal_steps = 0 THEN
    RETURN NEW;
  END IF;

  -- ✅ KLUCZOWY FIX 1: Sprawdź czy challenge NIE WYGASŁ
  IF v_deadline IS NOT NULL AND v_deadline < NOW() THEN
    v_is_expired := true;
    RAISE NOTICE '⏰ Challenge "%" expired at %, not sending completion notification', v_title, v_deadline;
  END IF;

  -- ✅ KLUCZOWY FIX 2: Sprawdź czy challenge został zakończony przedwcześnie (cancelled)
  IF NEW.status = 'cancelled' THEN
    RAISE NOTICE '🚫 Challenge "%" was cancelled, not sending completion notification', v_title;
    RETURN NEW;
  END IF;

  -- Oblicz procent postępu
  v_old_percent := (COALESCE(OLD.current_steps, 0) * 100) / v_goal_steps;
  v_new_percent := (NEW.current_steps * 100) / v_goal_steps;

  -- ✅ KLUCZOWY FIX 3: Wysyłaj powiadomienie TYLKO gdy:
  --    1. User przekroczył 100%
  --    2. Challenge NIE wygasł
  --    3. Challenge jest aktywny (status = 'active')
  IF v_old_percent < 100 AND v_new_percent >= 100 AND NOT v_is_expired AND NEW.status = 'active' THEN
    -- Wysyłaj na wszystkie platformy użytkownika
    FOR v_platform_record IN SELECT * FROM get_user_platforms(NEW.user_id)
    LOOP
      INSERT INTO public.push_outbox (user_id, platform, type, title, body, data)
      VALUES (
        NEW.user_id,
        v_platform_record.platform,
        'challenge_completed',
        'Gratulacje! 🎉',
        'Ukończyłeś "' || v_title || '" (' || v_goal_steps::text || ' kroków)!',
        jsonb_build_object(
          'type', 'challenge_completed',
          'user_challenge_id', NEW.id,
          'admin_challenge_id', NEW.admin_challenge_id,
          'goal_steps', v_goal_steps,
          'current_steps', NEW.current_steps
        )
      );
    END LOOP;
    
    RAISE NOTICE '✅ Sent completion notification for "%"', v_title;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. Upewnij się że trigger jest poprawnie ustawiony
-- ============================================
DROP TRIGGER IF EXISTS trg_push_challenge_completed ON public.user_challenges;

CREATE TRIGGER trg_push_challenge_completed
  AFTER UPDATE ON public.user_challenges
  FOR EACH ROW
  WHEN (OLD.current_steps IS DISTINCT FROM NEW.current_steps)
  EXECUTE FUNCTION public.enqueue_challenge_completed_push();

-- ============================================
-- 3. Dodaj funkcję pomocniczą do sprawdzania czy challenge wygasł
-- ============================================
CREATE OR REPLACE FUNCTION public.is_challenge_expired(p_admin_challenge_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deadline TIMESTAMPTZ;
BEGIN
  SELECT deadline INTO v_deadline
  FROM admin_challenges
  WHERE id = p_admin_challenge_id;
  
  -- Jeśli nie ma deadline, challenge nigdy nie wygasa
  IF v_deadline IS NULL THEN
    RETURN false;
  END IF;
  
  -- Sprawdź czy deadline minął
  RETURN v_deadline < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. Automatycznie oznacz wygasłe challenges jako 'expired'
-- ============================================
CREATE OR REPLACE FUNCTION public.mark_expired_challenges()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Znajdź wszystkie aktywne challenges które mają deadline w przeszłości
  UPDATE user_challenges uc
  SET 
    status = 'expired',
    updated_at = NOW()
  FROM admin_challenges ac
  WHERE 
    uc.admin_challenge_id = ac.id
    AND uc.status = 'active'
    AND ac.deadline IS NOT NULL
    AND ac.deadline < NOW();
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RAISE NOTICE '⏰ Marked % expired challenges', v_updated_count;
  
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. Uruchom raz funkcję aby oznaczyć już wygasłe challenges
-- ============================================
SELECT public.mark_expired_challenges();

COMMIT;

-- ============================================
-- Podsumowanie zmian
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Naprawiono walidację deadline dla challenges!';
  RAISE NOTICE '';
  RAISE NOTICE 'Fix 1 - Powiadomienia:';
  RAISE NOTICE '  ✓ Gratulacje wysyłane TYLKO gdy challenge jest aktywny';
  RAISE NOTICE '  ✓ Sprawdzanie deadline przed wysłaniem powiadomienia';
  RAISE NOTICE '  ✓ Sprawdzanie statusu (nie wysyła dla cancelled)';
  RAISE NOTICE '';
  RAISE NOTICE 'Fix 2 - Automatyczne wygaszanie:';
  RAISE NOTICE '  ✓ Dodano funkcję is_challenge_expired()';
  RAISE NOTICE '  ✓ Dodano funkcję mark_expired_challenges()';
  RAISE NOTICE '  ✓ Oznaczono wygasłe challenges jako "expired"';
  RAISE NOTICE '';
  RAISE NOTICE 'UWAGA: Frontend również wymaga aktualizacji!';
  RAISE NOTICE 'Trzeba sprawdzać deadline przed aktualizacją kroków.';
END $$;
