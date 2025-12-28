-- ============================================
-- MOVEE: 30-Day Campaign Leaderboard System
-- Migration 056
-- ============================================
-- Zmienia leaderboard z globalnego (od początku) na kampanie 30-dniowe
-- Każda kampania ma własny ranking, po 30 dniach automatyczny reset

BEGIN;

-- 1. Tabela kampanii (każda trwa 30 dni)
CREATE TABLE IF NOT EXISTS leaderboard_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_number INTEGER NOT NULL UNIQUE, -- np. 1, 2, 3...
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CHECK (end_date > start_date)
);

-- Index dla szybkiego szukania aktywnej kampanii
CREATE INDEX IF NOT EXISTS idx_campaigns_active 
  ON leaderboard_campaigns(is_active, start_date) 
  WHERE is_active = true;

-- 2. Tabela rankingu użytkowników w kampaniach
CREATE TABLE IF NOT EXISTS campaign_user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES leaderboard_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Statystyki w tej kampanii
  xp_earned INTEGER DEFAULT 0,
  challenges_completed INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  
  -- Timestamp
  last_updated TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(campaign_id, user_id)
);

-- Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_campaign_stats_campaign 
  ON campaign_user_stats(campaign_id, xp_earned DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_stats_user 
  ON campaign_user_stats(user_id);

-- 3. Funkcja: pobierz lub stwórz aktywną kampanię
CREATE OR REPLACE FUNCTION get_or_create_active_campaign()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_campaign_id UUID;
  v_today DATE := CURRENT_DATE;
  v_next_campaign_number INTEGER;
BEGIN
  -- Sprawdź czy istnieje aktywna kampania
  SELECT id INTO v_campaign_id
  FROM leaderboard_campaigns
  WHERE is_active = true
    AND start_date <= v_today
    AND end_date >= v_today
  LIMIT 1;
  
  -- Jeśli istnieje, zwróć jej ID
  IF v_campaign_id IS NOT NULL THEN
    RETURN v_campaign_id;
  END IF;
  
  -- Zamknij wszystkie poprzednie kampanie
  UPDATE leaderboard_campaigns
  SET is_active = false
  WHERE is_active = true;
  
  -- Pobierz numer następnej kampanii
  SELECT COALESCE(MAX(campaign_number), 0) + 1
  INTO v_next_campaign_number
  FROM leaderboard_campaigns;
  
  -- Stwórz nową kampanię (start: dziś, koniec: dziś + 30 dni)
  INSERT INTO leaderboard_campaigns (
    campaign_number,
    start_date,
    end_date,
    is_active
  )
  VALUES (
    v_next_campaign_number,
    v_today,
    v_today + INTERVAL '30 days',
    true
  )
  RETURNING id INTO v_campaign_id;
  
  RAISE NOTICE 'Created new campaign #% (% - %)', 
    v_next_campaign_number, 
    v_today, 
    v_today + INTERVAL '30 days';
  
  RETURN v_campaign_id;
END;
$$;

-- 4. Funkcja: aktualizuj statystyki użytkownika w kampanii
CREATE OR REPLACE FUNCTION update_campaign_user_stats(
  p_user_id UUID,
  p_xp_to_add INTEGER DEFAULT 0,
  p_challenges_to_add INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_campaign_id UUID;
  v_current_streak INTEGER;
BEGIN
  -- Pobierz aktywną kampanię (lub stwórz nową)
  v_campaign_id := get_or_create_active_campaign();
  
  -- Pobierz aktualny streak użytkownika
  SELECT current_streak INTO v_current_streak
  FROM users
  WHERE id = p_user_id;
  
  -- Upsert statystyk użytkownika w kampanii
  INSERT INTO campaign_user_stats (
    campaign_id,
    user_id,
    xp_earned,
    challenges_completed,
    streak_days,
    last_updated
  )
  VALUES (
    v_campaign_id,
    p_user_id,
    p_xp_to_add,
    p_challenges_to_add,
    COALESCE(v_current_streak, 0),
    now()
  )
  ON CONFLICT (campaign_id, user_id)
  DO UPDATE SET
    xp_earned = campaign_user_stats.xp_earned + p_xp_to_add,
    challenges_completed = campaign_user_stats.challenges_completed + p_challenges_to_add,
    streak_days = GREATEST(campaign_user_stats.streak_days, COALESCE(v_current_streak, 0)),
    last_updated = now();
END;
$$;

-- 5. Trigger: automatycznie aktualizuj statystyki kampanii gdy użytkownik zdobywa XP
CREATE OR REPLACE FUNCTION trigger_update_campaign_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Gdy XP się zwiększa
  IF NEW.xp > OLD.xp THEN
    PERFORM update_campaign_user_stats(
      NEW.id,
      NEW.xp - OLD.xp,
      0
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Usuń stary trigger jeśli istnieje
DROP TRIGGER IF EXISTS trigger_campaign_stats_on_xp_change ON users;

-- Stwórz nowy trigger
CREATE TRIGGER trigger_campaign_stats_on_xp_change
  AFTER UPDATE OF xp ON users
  FOR EACH ROW
  WHEN (NEW.xp IS DISTINCT FROM OLD.xp)
  EXECUTE FUNCTION trigger_update_campaign_stats();

-- 6. Trigger: aktualizuj statystyki gdy challenge jest ukończony
CREATE OR REPLACE FUNCTION trigger_update_campaign_on_challenge_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Gdy status zmienia się na 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM update_campaign_user_stats(
      NEW.user_id,
      0,
      1
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Usuń stary trigger jeśli istnieje
DROP TRIGGER IF EXISTS trigger_campaign_stats_on_challenge_complete ON user_challenges;

-- Stwórz nowy trigger
CREATE TRIGGER trigger_campaign_stats_on_challenge_complete
  AFTER UPDATE OF status ON user_challenges
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION trigger_update_campaign_on_challenge_complete();

-- 7. NOWA funkcja leaderboard - dla aktywnej kampanii (30 dni)
CREATE OR REPLACE FUNCTION get_campaign_leaderboard(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  display_name TEXT,
  email TEXT,
  level INTEGER,
  xp_in_campaign INTEGER,
  total_xp INTEGER,
  current_streak INTEGER,
  challenges_in_campaign INTEGER,
  total_challenges_completed BIGINT,
  is_current_user BOOLEAN,
  campaign_number INTEGER,
  campaign_end_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID;
  v_campaign_id UUID;
BEGIN
  -- Pobierz ID zalogowanego użytkownika
  v_current_user_id := auth.uid();
  
  -- Pobierz aktywną kampanię
  v_campaign_id := get_or_create_active_campaign();
  
  RETURN QUERY
  WITH active_campaign AS (
    SELECT id, campaign_number, end_date
    FROM leaderboard_campaigns
    WHERE id = v_campaign_id
  ),
  ranked_users AS (
    SELECT
      u.id,
      u.display_name AS original_display_name,
      u.email AS original_email,
      u.level,
      u.xp AS total_xp,
      u.current_streak,
      COALESCE(cus.xp_earned, 0) AS campaign_xp,
      COALESCE(cus.challenges_completed, 0) AS campaign_challenges,
      -- Zlicz wszystkie ukończone challenges (total)
      (
        SELECT COUNT(*)
        FROM user_challenges uc
        WHERE uc.user_id = u.id
          AND uc.status = 'completed'
      ) AS total_completed,
      -- Ranking po XP w kampanii (malejąco)
      ROW_NUMBER() OVER (
        ORDER BY COALESCE(cus.xp_earned, 0) DESC, 
                 u.level DESC, 
                 u.id
      ) AS user_rank,
      -- Czy to aktualny użytkownik?
      (u.id = v_current_user_id) AS is_me
    FROM users u
    LEFT JOIN campaign_user_stats cus 
      ON cus.user_id = u.id 
      AND cus.campaign_id = v_campaign_id
    WHERE u.is_guest = false  -- Tylko zalogowani użytkownicy
    ORDER BY COALESCE(cus.xp_earned, 0) DESC, u.level DESC
    LIMIT p_limit
    OFFSET p_offset
  )
  SELECT
    ru.user_rank AS rank,
    ru.id AS user_id,
    -- Anonimizuj display_name (oprócz własnego)
    CASE 
      WHEN ru.is_me THEN ru.original_display_name
      ELSE anonymize_display_name(ru.original_display_name)
    END AS display_name,
    -- Anonimizuj email (oprócz własnego)
    CASE 
      WHEN ru.is_me THEN ru.original_email
      ELSE anonymize_email(ru.original_email)
    END AS email,
    ru.level,
    ru.campaign_xp AS xp_in_campaign,
    ru.total_xp,
    ru.current_streak,
    ru.campaign_challenges AS challenges_in_campaign,
    ru.total_completed AS total_challenges_completed,
    ru.is_me AS is_current_user,
    ac.campaign_number,
    ac.end_date AS campaign_end_date
  FROM ranked_users ru
  CROSS JOIN active_campaign ac
  ORDER BY ru.user_rank;
END;
$$;

-- 8. NOWA funkcja pozycji użytkownika - dla aktywnej kampanii
CREATE OR REPLACE FUNCTION get_my_campaign_position()
RETURNS TABLE (
  my_rank BIGINT,
  total_users BIGINT,
  percentile NUMERIC,
  campaign_number INTEGER,
  days_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID;
  v_campaign_id UUID;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Pobierz aktywną kampanię
  v_campaign_id := get_or_create_active_campaign();
  
  RETURN QUERY
  WITH active_campaign AS (
    SELECT 
      id, 
      campaign_number,
      end_date,
      end_date - CURRENT_DATE AS days_left
    FROM leaderboard_campaigns
    WHERE id = v_campaign_id
  ),
  all_users AS (
    SELECT
      u.id,
      COALESCE(cus.xp_earned, 0) AS campaign_xp,
      u.level,
      ROW_NUMBER() OVER (
        ORDER BY COALESCE(cus.xp_earned, 0) DESC, 
                 u.level DESC, 
                 u.id
      ) AS user_rank
    FROM users u
    LEFT JOIN campaign_user_stats cus 
      ON cus.user_id = u.id 
      AND cus.campaign_id = v_campaign_id
    WHERE u.is_guest = false
  ),
  total_count AS (
    SELECT COUNT(*) AS total FROM all_users
  )
  SELECT
    au.user_rank AS my_rank,
    tc.total AS total_users,
    ROUND((au.user_rank::NUMERIC / tc.total::NUMERIC) * 100, 1) AS percentile,
    ac.campaign_number,
    ac.days_left AS days_remaining
  FROM all_users au
  CROSS JOIN total_count tc
  CROSS JOIN active_campaign ac
  WHERE au.id = v_current_user_id;
END;
$$;

-- 9. Funkcja do migracji obecnych danych do pierwszej kampanii
CREATE OR REPLACE FUNCTION migrate_existing_users_to_campaign()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_campaign_id UUID;
  v_user_record RECORD;
BEGIN
  -- Stwórz pierwszą kampanię jeśli nie istnieje
  v_campaign_id := get_or_create_active_campaign();
  
  -- Zmigruj wszystkich użytkowników z XP > 0
  FOR v_user_record IN 
    SELECT 
      id,
      xp,
      (
        SELECT COUNT(*)
        FROM user_challenges uc
        WHERE uc.user_id = users.id
          AND uc.status = 'completed'
      ) AS completed_challenges,
      current_streak
    FROM users
    WHERE is_guest = false
      AND xp > 0
  LOOP
    INSERT INTO campaign_user_stats (
      campaign_id,
      user_id,
      xp_earned,
      challenges_completed,
      streak_days
    )
    VALUES (
      v_campaign_id,
      v_user_record.id,
      v_user_record.xp,
      v_user_record.completed_challenges,
      v_user_record.current_streak
    )
    ON CONFLICT (campaign_id, user_id) DO NOTHING;
  END LOOP;
  
  RAISE NOTICE 'Migrated existing users to campaign #%', 
    (SELECT campaign_number FROM leaderboard_campaigns WHERE id = v_campaign_id);
END;
$$;

-- 10. Grant permissions
GRANT EXECUTE ON FUNCTION get_or_create_active_campaign() TO authenticated;
GRANT EXECUTE ON FUNCTION update_campaign_user_stats(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_campaign_leaderboard(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_campaign_position() TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_existing_users_to_campaign() TO authenticated;

GRANT SELECT ON leaderboard_campaigns TO authenticated;
GRANT SELECT ON campaign_user_stats TO authenticated;

-- 11. Zmigruj obecnych użytkowników do pierwszej kampanii
SELECT migrate_existing_users_to_campaign();

COMMIT;

-- ============================================
-- Podsumowanie
-- ============================================
DO $$
DECLARE
  v_campaign_info RECORD;
BEGIN
  SELECT campaign_number, start_date, end_date
  INTO v_campaign_info
  FROM leaderboard_campaigns
  WHERE is_active = true
  LIMIT 1;
  
  RAISE NOTICE '';
  RAISE NOTICE '🏆 Campaign Leaderboard System created!';
  RAISE NOTICE '';
  RAISE NOTICE 'Current Campaign: #%', v_campaign_info.campaign_number;
  RAISE NOTICE 'Duration: % to %', v_campaign_info.start_date, v_campaign_info.end_date;
  RAISE NOTICE 'Reset: Every 30 days';
  RAISE NOTICE '';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  ✅ 30-day campaigns with automatic reset';
  RAISE NOTICE '  ✅ Everyone starts fresh each campaign';
  RAISE NOTICE '  ✅ XP earned only counts in current campaign';
  RAISE NOTICE '  ✅ Automatic stats tracking via triggers';
  RAISE NOTICE '  ✅ Historical campaigns preserved';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions:';
  RAISE NOTICE '  - get_campaign_leaderboard(limit, offset) -- NEW';
  RAISE NOTICE '  - get_my_campaign_position() -- NEW';
  RAISE NOTICE '  - get_or_create_active_campaign()';
  RAISE NOTICE '';
END $$;
