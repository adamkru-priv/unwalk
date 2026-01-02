-- ============================================
-- SYSTEM POWIADOMIEŃ O WYGASŁYCH CHALLENGE'ACH
-- (bez pg_cron - używa istniejącego systemu push_outbox)
-- ============================================

-- 1. Dodaj kolumnę do śledzenia czy wysłano powiadomienie
ALTER TABLE user_challenges 
ADD COLUMN IF NOT EXISTS expiry_notification_sent BOOLEAN DEFAULT FALSE;

-- 2. Dodaj nowy typ powiadomienia do constraint (jeśli jeszcze nie istnieje)
-- Najpierw sprawdź jakie typy są dozwolone
DO $$
BEGIN
  -- Usuń stary constraint
  ALTER TABLE push_outbox DROP CONSTRAINT IF EXISTS push_outbox_type_check;
  
  -- Dodaj nowy z dodatkowym typem 'challenge_expired'
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
    'challenge_expired'  -- ✅ NOWY TYP
  ));
END $$;

-- 3. Funkcja sprawdzająca wygasłe challenge'e (do ręcznego wywołania)
CREATE OR REPLACE FUNCTION check_expired_challenges()
RETURNS TABLE(
  challenge_id UUID,
  user_id UUID,
  challenge_title TEXT,
  expired BOOLEAN,
  notification_sent BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uc.id,
    uc.user_id,
    ac.title,
    (uc.started_at + (ac.time_limit_hours || ' hours')::INTERVAL < NOW()) AS expired,
    uc.expiry_notification_sent
  FROM user_challenges uc
  JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
  WHERE uc.status = 'active'
    AND ac.time_limit_hours IS NOT NULL
    AND uc.started_at + (ac.time_limit_hours || ' hours')::INTERVAL < NOW();
END;
$$;

-- 4. Funkcja wysyłająca powiadomienia o wygasłych challenge'ach
CREATE OR REPLACE FUNCTION send_expired_challenge_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_challenge RECORD;
  notification_count INTEGER := 0;
BEGIN
  -- Znajdź wygasłe challenge'e bez powiadomienia
  FOR expired_challenge IN
    SELECT 
      uc.id AS challenge_id,
      uc.user_id,
      ac.title AS challenge_title,
      ac.is_team_challenge
    FROM user_challenges uc
    JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
    WHERE uc.status = 'active'
      AND uc.expiry_notification_sent = FALSE
      AND ac.time_limit_hours IS NOT NULL
      AND uc.started_at + (ac.time_limit_hours || ' hours')::INTERVAL < NOW()
  LOOP
    -- Dodaj powiadomienie do kolejki
    INSERT INTO push_outbox (user_id, platform, type, title, body, data, status)
    VALUES (
      expired_challenge.user_id,
      'ios',  -- Edge function obsługuje obie platformy
      'challenge_expired',
      'Challenge Completed! ⏰',
      expired_challenge.challenge_title || ' has ended. Open app to check your result!',
      jsonb_build_object(
        'type', 'challenge_expired',
        'challenge_id', expired_challenge.challenge_id,
        'screen', 'dashboard'
      ),
      'pending'
    );
    
    -- Oznacz że wysłano powiadomienie
    UPDATE user_challenges
    SET expiry_notification_sent = TRUE
    WHERE id = expired_challenge.challenge_id;
    
    notification_count := notification_count + 1;
    
    RAISE NOTICE 'Queued expiry notification for challenge % (user: %)', 
      expired_challenge.challenge_id, expired_challenge.user_id;
  END LOOP;
  
  RETURN notification_count;
END;
$$;

-- 5. Utwórz prostą tabelę do śledzenia ostatniego sprawdzenia (opcjonalne)
CREATE TABLE IF NOT EXISTS challenge_expiry_checks (
  id SERIAL PRIMARY KEY,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  notifications_sent INTEGER DEFAULT 0
);

-- ============================================
-- UŻYCIE
-- ============================================

-- Ręczne uruchomienie (wywołuj to z zewnątrz, np. przez GitHub Actions, Render Cron, lub ręcznie):
-- SELECT send_expired_challenge_notifications();

-- Sprawdź które challenge'e są wygasłe:
-- SELECT * FROM check_expired_challenges();

-- Sprawdź historię sprawdzeń:
-- SELECT * FROM challenge_expiry_checks ORDER BY checked_at DESC LIMIT 10;

-- ============================================
-- OPCJA: Użyj zewnętrznego CRON (np. GitHub Actions)
-- ============================================

-- Możesz wywołać tę funkcję z zewnątrz przez Supabase REST API:
-- POST https://your-project.supabase.co/rest/v1/rpc/send_expired_challenge_notifications
-- Headers:
--   apikey: your-anon-key
--   Authorization: Bearer your-service-role-key
--   Content-Type: application/json
-- Body: {}

-- Lub stwórz Edge Function która wywołuje tę funkcję:
-- Deno.serve(async () => {
--   const supabase = createClient(...)
--   const { data, error } = await supabase.rpc('send_expired_challenge_notifications')
--   return new Response(JSON.stringify({ count: data }))
-- })

COMMIT;
