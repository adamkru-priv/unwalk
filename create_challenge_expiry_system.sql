-- ============================================
-- SYSTEM AUTOMATYCZNEGO SPRAWDZANIA WYGASŁYCH CHALLENGE'ÓW
-- ============================================

-- 1. Dodaj kolumnę do śledzenia czy wysłano powiadomienie o zakończeniu
ALTER TABLE user_challenges 
ADD COLUMN IF NOT EXISTS expiry_notification_sent BOOLEAN DEFAULT FALSE;

-- 2. Funkcja sprawdzająca wygasłe challenge'e i wysyłająca powiadomienia
CREATE OR REPLACE FUNCTION check_expired_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_challenge RECORD;
  notification_title TEXT;
  notification_body TEXT;
BEGIN
  -- Znajdź aktywne challenge'e, które już wygasły i nie dostały powiadomienia
  FOR expired_challenge IN
    SELECT 
      uc.id,
      uc.user_id,
      uc.status,
      uc.started_at,
      ac.title,
      ac.time_limit_hours,
      ac.is_team_challenge,
      u.push_token
    FROM user_challenges uc
    JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
    JOIN users u ON uc.user_id = u.id
    WHERE uc.status = 'active'
      AND uc.expiry_notification_sent = FALSE
      AND ac.time_limit_hours IS NOT NULL
      AND uc.started_at + (ac.time_limit_hours || ' hours')::INTERVAL < NOW()
      AND u.push_token IS NOT NULL
  LOOP
    -- Przygotuj treść powiadomienia
    notification_title := 'Challenge Completed! ⏰';
    notification_body := expired_challenge.title || ' has ended. Open app to check your result!';
    
    -- Dodaj powiadomienie do kolejki (zakładam że macie tabelę push_outbox)
    INSERT INTO push_outbox (user_id, title, body, data, status)
    VALUES (
      expired_challenge.user_id,
      notification_title,
      notification_body,
      jsonb_build_object(
        'type', 'challenge_expired',
        'challenge_id', expired_challenge.id,
        'screen', 'dashboard'
      ),
      'pending'
    );
    
    -- Oznacz że wysłano powiadomienie
    UPDATE user_challenges
    SET expiry_notification_sent = TRUE
    WHERE id = expired_challenge.id;
    
    RAISE NOTICE 'Sent expiry notification for challenge % to user %', 
      expired_challenge.id, expired_challenge.user_id;
  END LOOP;
  
  RAISE NOTICE 'Finished checking expired challenges';
END;
$$;

-- 3. Utwórz pg_cron job który uruchamia się co minutę
SELECT cron.schedule(
  'check-expired-challenges',  -- nazwa joba
  '* * * * *',                  -- co minutę
  $$SELECT check_expired_challenges()$$
);

-- 4. Sprawdź czy job został utworzony
SELECT * FROM cron.job WHERE jobname = 'check-expired-challenges';

-- ============================================
-- UŻYCIE I TESTOWANIE
-- ============================================

-- Sprawdź logi wykonania:
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'check-expired-challenges')
-- ORDER BY start_time DESC LIMIT 10;

-- Ręczne uruchomienie (test):
-- SELECT check_expired_challenges();

-- Wyłączenie joba (jeśli potrzeba):
-- SELECT cron.unschedule('check-expired-challenges');

-- Włączenie ponownie:
-- SELECT cron.schedule(
--   'check-expired-challenges',
--   '* * * * *',
--   $$SELECT check_expired_challenges()$$
-- );
