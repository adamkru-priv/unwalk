-- ============================================
-- FIX: Challenge notifications
-- ============================================
-- Problem 1: Powiadomienia o ukończonym challenge wysyłane gdy challenge kończy się bez 100%
-- Problem 2: Brak powiadomienia push o zaproszeniu do team challenge
-- 
-- Fix 1: Wysyłaj powiadomienie o ukończeniu tylko gdy challenge jest na 100% 
--        i pokaż cel (np. "15000 kroków") zamiast wielkości nagrody
-- Fix 2: Dodaj brakujący trigger dla powiadomień o team challenge
-- ============================================

BEGIN;

-- ============================================
-- 1. Zaktualizuj funkcję challenge_completed
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

  -- Pobierz dane challenge'u
  SELECT COALESCE(ac.title, 'Challenge'), ac.goal_steps 
  INTO v_title, v_goal_steps
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  -- Jeśli brak goal_steps, nie wysyłaj powiadomienia
  IF v_goal_steps IS NULL OR v_goal_steps = 0 THEN
    RETURN NEW;
  END IF;

  -- Oblicz procent postępu
  v_old_percent := (COALESCE(OLD.current_steps, 0) * 100) / v_goal_steps;
  v_new_percent := (NEW.current_steps * 100) / v_goal_steps;

  -- ✅ KLUCZOWY FIX: Wysyłaj powiadomienie TYLKO gdy user przekroczył 100%
  IF v_old_percent < 100 AND v_new_percent >= 100 THEN
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
  WHEN (OLD.current_steps IS DISTINCT FROM NEW.current_steps AND NEW.status = 'active')
  EXECUTE FUNCTION public.enqueue_challenge_completed_push();

-- ============================================
-- 3. Dodaj BRAKUJĄCY trigger dla team challenge invitations
-- ============================================
-- Funkcja enqueue_challenge_assigned_push() już istnieje w systemie,
-- ale brakuje triggera który by ją wywoływał!

DROP TRIGGER IF EXISTS trg_push_challenge_assigned ON public.challenge_assignments;

CREATE TRIGGER trg_push_challenge_assigned
  AFTER INSERT ON public.challenge_assignments
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.enqueue_challenge_assigned_push();

-- ============================================
-- 4. Dodaj również trigger dla statusu (accepted/rejected)
-- ============================================
DROP TRIGGER IF EXISTS trg_push_challenge_assignment_status ON public.challenge_assignments;

CREATE TRIGGER trg_push_challenge_assignment_status
  AFTER UPDATE ON public.challenge_assignments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('accepted', 'rejected'))
  EXECUTE FUNCTION public.enqueue_challenge_assignment_status_push();

COMMIT;

-- ============================================
-- Podsumowanie zmian
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Naprawiono system powiadomień challenge!';
  RAISE NOTICE '';
  RAISE NOTICE 'Fix 1 - Challenge completed:';
  RAISE NOTICE '  ✓ Powiadomienie wysyłane TYLKO gdy challenge osiągnie 100%%';
  RAISE NOTICE '  ✓ Treść pokazuje cel (np. "15000 kroków") zamiast wielkości nagrody';
  RAISE NOTICE '  ✓ Usunięto informację "Odbierz X punktów" (może być już odebrana)';
  RAISE NOTICE '  ✓ Dodano weryfikację goal_steps przed wysłaniem';
  RAISE NOTICE '';
  RAISE NOTICE 'Fix 2 - Team challenge invitations:';
  RAISE NOTICE '  ✓ Dodano trigger trg_push_challenge_assigned (BRAKOWAŁO!)';
  RAISE NOTICE '  ✓ Powiadomienia będą wysyłane gdy ktoś wyśle team challenge';
  RAISE NOTICE '  ✓ Dodano trigger dla statusu (accepted/rejected)';
END $$;
