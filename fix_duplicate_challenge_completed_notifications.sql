-- ============================================
-- FIX: Duplicate Challenge Completed Notifications
-- ============================================
-- Problem: Po wejściu na ekran Solo/Team, aplikacja synchronizuje kroki z HealthKit,
--          co wyzwala trigger i wysyła DUPLIKAT powiadomienia o ukończeniu wyzwania.
--
-- Root Cause: Trigger nie sprawdza, czy powiadomienie zostało już wysłane wcześniej.
--
-- Solution: Przed wysłaniem powiadomienia, sprawdź czy w push_outbox nie ma już
--          powiadomienia typu 'challenge_completed' dla tego user_challenge_id.
-- ============================================

BEGIN;

-- ============================================
-- 1. Zaktualizuj funkcję enqueue_challenge_completed_push
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
  v_push_enabled BOOLEAN;
  v_notification_exists BOOLEAN;
BEGIN
  -- Sprawdź czy user ma włączone powiadomienia
  SELECT push_enabled INTO v_push_enabled
  FROM users
  WHERE id = NEW.user_id;
  
  IF NOT COALESCE(v_push_enabled, false) THEN
    RETURN NEW;
  END IF;

  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(ac.title, 'Challenge'), ac.goal_steps INTO v_title, v_goal_steps
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  IF v_goal_steps IS NULL OR v_goal_steps = 0 THEN
    RETURN NEW;
  END IF;

  v_old_percent := (COALESCE(OLD.current_steps, 0) * 100) / v_goal_steps;
  v_new_percent := (NEW.current_steps * 100) / v_goal_steps;

  -- ✅ KLUCZOWY FIX: Wysyłaj powiadomienie TYLKO gdy:
  -- 1. User przekroczył 100% (z < 100% do >= 100%)
  -- 2. NIE WYSŁANO JUŻ powiadomienia dla tego wyzwania
  IF v_old_percent < 100 AND v_new_percent >= 100 THEN
    
    -- Sprawdź, czy powiadomienie zostało już wysłane
    SELECT EXISTS (
      SELECT 1 
      FROM push_outbox 
      WHERE user_id = NEW.user_id 
        AND type = 'challenge_completed'
        AND data->>'user_challenge_id' = NEW.id::text
    ) INTO v_notification_exists;

    -- Jeśli powiadomienie już istnieje, nie wysyłaj ponownie
    IF v_notification_exists THEN
      RAISE NOTICE 'Powiadomienie challenge_completed dla user_challenge_id=% juz istnieje, pomijam duplikat', NEW.id;
      RETURN NEW;
    END IF;

    -- Wyślij powiadomienie
    INSERT INTO public.push_outbox (user_id, type, title, body, data)
    VALUES (
      NEW.user_id,
      'challenge_completed',
      'Gratulacje! 🎉',
      'Ukończyłeś wyzwanie: ' || v_title || ' (' || v_goal_steps::text || ' kroków)',
      jsonb_build_object(
        'type', 'challenge_completed',
        'user_challenge_id', NEW.id,
        'admin_challenge_id', NEW.admin_challenge_id,
        'current_steps', NEW.current_steps,
        'goal_steps', v_goal_steps
      )
    );

    RAISE NOTICE 'Wyslano powiadomienie challenge_completed dla user_challenge_id=%', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================
-- Podsumowanie zmian
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Naprawiono duplikowanie powiadomien challenge_completed!';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Fix:';
  RAISE NOTICE '  Przed wyslaniem powiadomienia, sprawdzamy czy juz nie istnieje w push_outbox';
  RAISE NOTICE '  Jesli istnieje, pomijamy duplikat i logujemy informacje';
  RAISE NOTICE '  Trigger nie wysle juz powiadomienia po synchronizacji krokow z HealthKit';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Test:';
  RAISE NOTICE '  1. Ukoncz wyzwanie (osiagnij 100%%)';
  RAISE NOTICE '  2. Otrzymasz powiadomienie push';
  RAISE NOTICE '  3. Wejdz na ekran Solo/Team (synchronizacja z HealthKit)';
  RAISE NOTICE '  4. NIE otrzymasz duplikatu powiadomienia';
END $$;
