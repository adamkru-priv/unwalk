-- ============================================
-- MOVEE: Global Leaderboard System
-- Migration 055
-- ============================================
-- Tworzy funkcję do pobierania globalnego rankingu użytkowników
-- z anonimizacją danych (oprócz własnego konta)

BEGIN;

-- 1. Funkcja do anonimizacji email (a***@gmail.com)
CREATE OR REPLACE FUNCTION anonymize_email(email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_local_part TEXT;
  v_domain TEXT;
  v_first_char TEXT;
BEGIN
  IF email IS NULL OR email = '' THEN
    RETURN 'Anonymous';
  END IF;
  
  -- Rozdziel email na local part i domain
  v_local_part := split_part(email, '@', 1);
  v_domain := split_part(email, '@', 2);
  
  -- Weź pierwszą literę local part
  v_first_char := substring(v_local_part, 1, 1);
  
  -- Zwróć zanonimizowany email (np. a***@gmail.com)
  RETURN v_first_char || '***@' || v_domain;
END;
$$;

-- 2. Funkcja do anonimizacji display name (Adam K.)
CREATE OR REPLACE FUNCTION anonymize_display_name(display_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_parts TEXT[];
  v_first_name TEXT;
  v_last_initial TEXT;
BEGIN
  IF display_name IS NULL OR display_name = '' THEN
    RETURN 'Anonymous';
  END IF;
  
  -- Rozdziel imię i nazwisko
  v_parts := string_to_array(display_name, ' ');
  
  IF array_length(v_parts, 1) >= 2 THEN
    -- Jeśli są 2+ słowa: "Adam K."
    v_first_name := v_parts[1];
    v_last_initial := substring(v_parts[2], 1, 1) || '.';
    RETURN v_first_name || ' ' || v_last_initial;
  ELSE
    -- Jeśli jedno słowo: "Adam"
    RETURN v_parts[1];
  END IF;
END;
$$;

-- 3. Główna funkcja leaderboard - pobiera top 100 użytkowników
-- Anonimizuje dane wszystkich oprócz calling user
CREATE OR REPLACE FUNCTION get_global_leaderboard(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  display_name TEXT,
  email TEXT,
  level INTEGER,
  xp INTEGER,
  current_streak INTEGER,
  longest_streak INTEGER,
  total_challenges_completed BIGINT,
  is_current_user BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID;
BEGIN
  -- Pobierz ID zalogowanego użytkownika
  v_current_user_id := auth.uid();
  
  RETURN QUERY
  WITH ranked_users AS (
    SELECT
      u.id,
      u.display_name AS original_display_name,
      u.email AS original_email,
      u.level,
      u.xp,
      u.current_streak,
      u.longest_streak,
      -- Zlicz ukończone challenges
      (
        SELECT COUNT(*)
        FROM user_challenges uc
        WHERE uc.user_id = u.id
          AND uc.status = 'completed'
      ) AS completed_challenges,
      -- Ranking po XP (malejąco)
      ROW_NUMBER() OVER (ORDER BY u.xp DESC, u.level DESC, u.id) AS user_rank,
      -- Czy to aktualny użytkownik?
      (u.id = v_current_user_id) AS is_me
    FROM users u
    WHERE u.is_guest = false  -- Tylko zalogowani użytkownicy
      AND u.xp > 0              -- Tylko użytkownicy z XP > 0
    ORDER BY u.xp DESC, u.level DESC
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
    ru.xp,
    ru.current_streak,
    ru.longest_streak,
    ru.completed_challenges AS total_challenges_completed,
    ru.is_me AS is_current_user
  FROM ranked_users ru
  ORDER BY ru.user_rank;
END;
$$;

-- 4. Funkcja do pobierania pozycji użytkownika w rankingu
CREATE OR REPLACE FUNCTION get_my_leaderboard_position()
RETURNS TABLE (
  my_rank BIGINT,
  total_users BIGINT,
  percentile NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  WITH all_users AS (
    SELECT
      id,
      xp,
      level,
      ROW_NUMBER() OVER (ORDER BY xp DESC, level DESC, id) AS user_rank
    FROM users
    WHERE is_guest = false
      AND xp > 0
  ),
  total_count AS (
    SELECT COUNT(*) AS total FROM all_users
  )
  SELECT
    au.user_rank AS my_rank,
    tc.total AS total_users,
    ROUND((au.user_rank::NUMERIC / tc.total::NUMERIC) * 100, 1) AS percentile
  FROM all_users au
  CROSS JOIN total_count tc
  WHERE au.id = v_current_user_id;
END;
$$;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION anonymize_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION anonymize_display_name(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_global_leaderboard(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_leaderboard_position() TO authenticated;

COMMIT;

-- ============================================
-- Podsumowanie
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Global Leaderboard System created!';
  RAISE NOTICE '';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  - Top 100 users by XP';
  RAISE NOTICE '  - Anonymized emails (a***@gmail.com)';
  RAISE NOTICE '  - Anonymized names (Adam K.)';
  RAISE NOTICE '  - Your data is NOT anonymized';
  RAISE NOTICE '  - Shows: Level, XP, Streak, Challenges Completed';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions:';
  RAISE NOTICE '  - get_global_leaderboard(limit, offset)';
  RAISE NOTICE '  - get_my_leaderboard_position()';
END $$;