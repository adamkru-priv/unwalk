-- ============================================
-- SYSTEM AUTOMATYCZNYCH POWIADOMIEŃ O WYGASAJĄCYCH CHALLENGE'ACH
-- ============================================

-- 1. Tabela zaplanowanych powiadomień
CREATE TABLE IF NOT EXISTS scheduled_challenge_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_challenge_id UUID NOT NULL REFERENCES user_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_title TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  notification_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Index dla szybkiego wyszukiwania powiadomień do wysłania
  CONSTRAINT unique_notification_per_challenge UNIQUE(user_challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_pending 
ON scheduled_challenge_notifications(scheduled_for) 
WHERE notification_sent = FALSE;

COMMENT ON TABLE scheduled_challenge_notifications IS 'Stores scheduled push notifications for challenge expiry';

-- 2. Dodaj kolumnę w user_challenges jeśli nie istnieje
ALTER TABLE user_challenges 
ADD COLUMN IF NOT EXISTS expiry_notification_sent BOOLEAN DEFAULT FALSE;

-- 3. Funkcja automatycznie tworząca zaplanowane powiadomienie przy starcie challenge'a
CREATE OR REPLACE FUNCTION schedule_challenge_expiry_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_challenge_title TEXT;
  v_time_limit_hours INTEGER;
  v_expiry_time TIMESTAMPTZ;
BEGIN
  -- Tylko dla challenge'y które są startowane (status zmienia się na 'active')
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    
    -- Pobierz informacje o challenge
    SELECT ac.title, ac.time_limit_hours
    INTO v_challenge_title, v_time_limit_hours
    FROM admin_challenges ac
    WHERE ac.id = NEW.admin_challenge_id;
    
    -- Jeśli challenge ma time limit, zaplanuj powiadomienie
    IF v_time_limit_hours IS NOT NULL THEN
      v_expiry_time := NEW.started_at + (v_time_limit_hours || ' hours')::INTERVAL;
      
      -- Dodaj zaplanowane powiadomienie
      INSERT INTO scheduled_challenge_notifications (
        user_challenge_id,
        user_id,
        challenge_title,
        scheduled_for
      )
      VALUES (
        NEW.id,
        NEW.user_id,
        v_challenge_title,
        v_expiry_time
      )
      ON CONFLICT (user_challenge_id) DO NOTHING; -- Jeśli już istnieje, pomiń
      
      RAISE NOTICE '📅 Scheduled expiry notification for challenge % at %', 
        NEW.id, v_expiry_time;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Trigger który automatycznie planuje powiadomienie
DROP TRIGGER IF EXISTS trigger_schedule_challenge_expiry ON user_challenges;
CREATE TRIGGER trigger_schedule_challenge_expiry
  AFTER INSERT OR UPDATE OF status ON user_challenges
  FOR EACH ROW
  EXECUTE FUNCTION schedule_challenge_expiry_notification();

-- 5. Funkcja wysyłająca powiadomienia (wywołuj ją co minutę z zewnątrz)
CREATE OR REPLACE FUNCTION send_pending_challenge_notifications()
RETURNS TABLE(sent_count INTEGER, details JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification RECORD;
  v_sent_count INTEGER := 0;
  v_details JSONB := '[]'::JSONB;
BEGIN
  -- Znajdź wszystkie powiadomienia które powinny być wysłane (z 5 min marginesem)
  FOR v_notification IN
    SELECT 
      scn.id,
      scn.user_challenge_id,
      scn.user_id,
      scn.challenge_title,
      scn.scheduled_for
    FROM scheduled_challenge_notifications scn
    WHERE scn.notification_sent = FALSE
      AND scn.scheduled_for <= NOW() + INTERVAL '5 minutes'
    ORDER BY scn.scheduled_for
    LIMIT 100 -- Limit bezpieczeństwa
  LOOP
    BEGIN
      -- Dodaj powiadomienie do push_outbox
      INSERT INTO push_outbox (user_id, platform, type, title, body, data, status)
      VALUES (
        v_notification.user_id,
        'ios', -- Edge function automatycznie wykryje platformę
        'challenge_expired',
        'Challenge Time is Up! ⏰',
        'Your challenge "' || v_notification.challenge_title || '" has ended. Check your results!',
        jsonb_build_object(
          'type', 'challenge_expired',
          'challenge_id', v_notification.user_challenge_id,
          'screen', 'dashboard'
        ),
        'pending'
      );
      
      -- Oznacz jako wysłane
      UPDATE scheduled_challenge_notifications
      SET 
        notification_sent = TRUE,
        sent_at = NOW()
      WHERE id = v_notification.id;
      
      -- Oznacz w user_challenges
      UPDATE user_challenges
      SET expiry_notification_sent = TRUE
      WHERE id = v_notification.user_challenge_id;
      
      v_sent_count := v_sent_count + 1;
      
      -- Dodaj do detali
      v_details := v_details || jsonb_build_object(
        'challenge_id', v_notification.user_challenge_id,
        'user_id', v_notification.user_id,
        'title', v_notification.challenge_title,
        'scheduled_for', v_notification.scheduled_for
      );
      
      RAISE NOTICE '✅ Sent expiry notification for challenge % (user: %)', 
        v_notification.user_challenge_id, v_notification.user_id;
        
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '❌ Failed to send notification for challenge %: %', 
        v_notification.user_challenge_id, SQLERRM;
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_sent_count, v_details;
END;
$$;

-- 6. Dodaj nowy typ powiadomienia do constraint
DO $$
BEGIN
  ALTER TABLE push_outbox DROP CONSTRAINT IF EXISTS push_outbox_type_check;
  
  ALTER TABLE push_outbox ADD CONSTRAINT push_outbox_type_check
  CHECK (type IN (
    'challenge_started',
    'challenge_completed',
    'challenge_assigned',
    'challenge_assignment_accepted',
    'challenge_assignment_rejected',
    'challenge_assignment_started',
    'challenge_assignment_completed',
    'team_invitation_received',
    'challenge_expired'
  ));
END $$;

-- ============================================
-- FUNKCJE POMOCNICZE
-- ============================================

-- Sprawdź zaplanowane powiadomienia
CREATE OR REPLACE FUNCTION check_scheduled_notifications()
RETURNS TABLE(
  challenge_id UUID,
  user_id UUID,
  challenge_title TEXT,
  scheduled_for TIMESTAMPTZ,
  time_until_send INTERVAL,
  notification_sent BOOLEAN
)
LANGUAGE SQL
AS $$
  SELECT 
    user_challenge_id,
    user_id,
    challenge_title,
    scheduled_for,
    scheduled_for - NOW() AS time_until_send,
    notification_sent
  FROM scheduled_challenge_notifications
  ORDER BY scheduled_for;
$$;

-- Wyczyść stare wysłane powiadomienia (starsze niż 30 dni)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM scheduled_challenge_notifications
  WHERE notification_sent = TRUE
    AND sent_at < NOW() - INTERVAL '30 days';
    
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- ============================================
-- UŻYCIE
-- ============================================

-- Automatyczne planowanie działa od razu po uruchomieniu tego skryptu!
-- Każdy nowy challenge z time_limit_hours automatycznie dostanie zaplanowane powiadomienie.

-- WAŻNE: Musisz wywołać tę funkcję co minutę z zewnątrz:
-- SELECT * FROM send_pending_challenge_notifications();

-- Możesz użyć:
-- 1. GitHub Actions Cron (co minutę)
-- 2. Render.com Cron Jobs
-- 3. Supabase Edge Function z zewnętrznym cronem (cron-job.org)
-- 4. AWS EventBridge / CloudWatch

-- Sprawdź co jest zaplanowane:
-- SELECT * FROM check_scheduled_notifications();

-- Wyczyść stare powiadomienia:
-- SELECT cleanup_old_notifications();

COMMIT;
