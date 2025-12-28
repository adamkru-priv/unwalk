-- ============================================
-- MOVEE: Naprawa systemu powiadomień push
-- Migration 052
-- ============================================
-- Przywraca wszystkie triggery powiadomień po migracji 051
-- Problem: DELETE FROM xp_transactions mógł usunąć lub zablokować triggery

BEGIN;

-- ============================================
-- 1) Upewnij się, że tabela push_outbox ma wszystkie typy
-- ============================================
ALTER TABLE public.push_outbox
  DROP CONSTRAINT IF EXISTS push_outbox_type_check;

ALTER TABLE public.push_outbox
  ADD CONSTRAINT push_outbox_type_check
  CHECK (type IN (
    'challenge_started',
    'challenge_completed',
    'challenge_ready_to_claim',
    'milestone_reached',
    'challenge_assigned',
    'challenge_assignment_accepted',
    'challenge_assignment_rejected',
    'challenge_assignment_started'
  ));

-- ============================================
-- 2) Odtwórz wszystkie funkcje triggerów (na wypadek gdyby zostały usunięte)
-- ============================================

-- Challenge Started
CREATE OR REPLACE FUNCTION public.enqueue_challenge_started_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_goal_steps INT;
  v_push_enabled BOOLEAN;
BEGIN
  -- Sprawdź czy user ma włączone powiadomienia
  SELECT push_enabled INTO v_push_enabled
  FROM users
  WHERE id = NEW.user_id;
  
  IF NOT COALESCE(v_push_enabled, false) THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(ac.title, 'Challenge'), ac.goal_steps INTO v_title, v_goal_steps
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  INSERT INTO public.push_outbox (user_id, type, title, body, data)
  VALUES (
    NEW.user_id,
    'challenge_started',
    'MOVEE 🚀',
    'Rozpocząłeś wyzwanie: ' || v_title || ' (' || COALESCE(v_goal_steps::text, '0') || ' kroków)',
    jsonb_build_object(
      'type', 'challenge_started',
      'user_challenge_id', NEW.id,
      'admin_challenge_id', NEW.admin_challenge_id,
      'goal_steps', v_goal_steps
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Challenge Completed
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

  IF v_old_percent < 100 AND v_new_percent >= 100 THEN
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
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ready to Claim
CREATE OR REPLACE FUNCTION public.enqueue_ready_to_claim_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_points INT;
  v_goal_steps INT;
  v_push_enabled BOOLEAN;
BEGIN
  -- Sprawdź czy user ma włączone powiadomienia
  SELECT push_enabled INTO v_push_enabled
  FROM users
  WHERE id = NEW.user_id;
  
  IF NOT COALESCE(v_push_enabled, false) THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'completed' OR NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(ac.title, 'Challenge'), COALESCE(ac.points, 0), ac.goal_steps 
  INTO v_title, v_points, v_goal_steps
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  INSERT INTO public.push_outbox (user_id, type, title, body, data)
  VALUES (
    NEW.user_id,
    'challenge_ready_to_claim',
    'Odbierz nagrodę! 🏆',
    'Zdobądź ' || v_points || ' punktów za ukończenie: ' || v_title,
    jsonb_build_object(
      'type', 'challenge_ready_to_claim',
      'user_challenge_id', NEW.id,
      'admin_challenge_id', NEW.admin_challenge_id,
      'points', v_points,
      'goal_steps', v_goal_steps
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Milestone
CREATE OR REPLACE FUNCTION public.enqueue_milestone_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_goal_steps INT;
  v_progress_percent INT;
  v_milestone INT;
  v_old_progress_percent INT;
  v_push_enabled BOOLEAN;
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

  v_progress_percent := (NEW.current_steps * 100) / v_goal_steps;
  v_old_progress_percent := (COALESCE(OLD.current_steps, 0) * 100) / v_goal_steps;

  v_milestone := NULL;
  
  IF v_old_progress_percent < 50 AND v_progress_percent >= 50 THEN
    v_milestone := 50;
  ELSIF v_old_progress_percent < 75 AND v_progress_percent >= 75 THEN
    v_milestone := 75;
  END IF;

  IF v_milestone IS NOT NULL THEN
    INSERT INTO public.push_outbox (user_id, type, title, body, data)
    VALUES (
      NEW.user_id,
      'milestone_reached',
      'Świetna robota! 💪',
      'Osiągnąłeś ' || v_milestone || '% wyzwania: ' || v_title || ' (' || NEW.current_steps::text || '/' || v_goal_steps::text || ' kroków)',
      jsonb_build_object(
        'type', 'milestone_reached',
        'user_challenge_id', NEW.id,
        'admin_challenge_id', NEW.admin_challenge_id,
        'milestone', v_milestone,
        'current_steps', NEW.current_steps,
        'goal_steps', v_goal_steps
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3) USUŃ wszystkie istniejące triggery i utwórz je na nowo
-- ============================================

DROP TRIGGER IF EXISTS trg_push_challenge_started ON public.user_challenges;
DROP TRIGGER IF EXISTS trg_push_challenge_completed ON public.user_challenges;
DROP TRIGGER IF EXISTS trg_push_ready_to_claim ON public.user_challenges;
DROP TRIGGER IF EXISTS trg_push_milestone ON public.user_challenges;
DROP TRIGGER IF EXISTS trg_push_challenge_assignment_started ON public.user_challenges;

-- Utwórz triggery na nowo
CREATE TRIGGER trg_push_challenge_started
  AFTER INSERT ON public.user_challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_challenge_started_push();

CREATE TRIGGER trg_push_challenge_completed
  AFTER UPDATE ON public.user_challenges
  FOR EACH ROW
  WHEN (OLD.current_steps IS DISTINCT FROM NEW.current_steps AND NEW.status = 'active')
  EXECUTE FUNCTION public.enqueue_challenge_completed_push();

CREATE TRIGGER trg_push_ready_to_claim
  AFTER UPDATE ON public.user_challenges
  FOR EACH ROW
  WHEN (OLD.status = 'active' AND NEW.status = 'completed')
  EXECUTE FUNCTION public.enqueue_ready_to_claim_push();

CREATE TRIGGER trg_push_milestone
  AFTER UPDATE ON public.user_challenges
  FOR EACH ROW
  WHEN (OLD.current_steps IS DISTINCT FROM NEW.current_steps)
  EXECUTE FUNCTION public.enqueue_milestone_push();

-- Assignment started (tylko jeśli assigned_by nie jest NULL)
CREATE OR REPLACE FUNCTION public.enqueue_challenge_assignment_started_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_name TEXT;
  v_title TEXT;
  v_assignment_id UUID;
  v_push_enabled BOOLEAN;
BEGIN
  IF NEW.assigned_by IS NULL THEN
    RETURN NEW;
  END IF;

  -- Sprawdź czy sender ma włączone powiadomienia
  SELECT push_enabled INTO v_push_enabled
  FROM users
  WHERE id = NEW.assigned_by;
  
  IF NOT COALESCE(v_push_enabled, false) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(u.display_name, 'Użytkownik') INTO v_recipient_name
  FROM public.users u
  WHERE u.id = NEW.user_id;

  SELECT COALESCE(ac.title, 'Challenge') INTO v_title
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  SELECT ca.id INTO v_assignment_id
  FROM public.challenge_assignments ca
  WHERE ca.user_challenge_id = NEW.id
  LIMIT 1;

  INSERT INTO public.push_outbox (user_id, type, title, body, data)
  VALUES (
    NEW.assigned_by,
    'challenge_assignment_started',
    'MOVEE',
    v_recipient_name || ' rozpoczął wyzwanie: ' || v_title,
    jsonb_build_object(
      'type', 'challenge_assignment_started',
      'assignment_id', v_assignment_id,
      'sender_id', NEW.assigned_by,
      'recipient_id', NEW.user_id,
      'user_challenge_id', NEW.id,
      'admin_challenge_id', NEW.admin_challenge_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_push_challenge_assignment_started
  AFTER INSERT ON public.user_challenges
  FOR EACH ROW
  WHEN (NEW.assigned_by IS NOT NULL)
  EXECUTE FUNCTION public.enqueue_challenge_assignment_started_push();

COMMIT;

-- ============================================
-- Podsumowanie
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ System powiadomień push został naprawiony!';
  RAISE NOTICE '';
  RAISE NOTICE 'Odtworzone triggery:';
  RAISE NOTICE '  • trg_push_challenge_started (INSERT)';
  RAISE NOTICE '  • trg_push_challenge_completed (UPDATE - crossing 100%%)';
  RAISE NOTICE '  • trg_push_ready_to_claim (UPDATE - status -> completed)';
  RAISE NOTICE '  • trg_push_milestone (UPDATE - 50%%, 75%%)';
  RAISE NOTICE '  • trg_push_challenge_assignment_started (INSERT with assigned_by)';
  RAISE NOTICE '';
  RAISE NOTICE 'Wszystkie funkcje triggerów sprawdzają teraz push_enabled!';
END $$;
