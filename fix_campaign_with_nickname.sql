-- ============================================
-- FIX: Dodaj nickname do get_campaign_leaderboard
-- Używa prawidłowych tabel: campaign_user_stats, leaderboard_campaigns
-- ============================================

-- Usuń starą funkcję
DROP FUNCTION IF EXISTS get_campaign_leaderboard(integer, integer);

-- Utwórz poprawioną funkcję z nickname
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
  campaign_end_date TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    SELECT 
      lc.id as camp_id, 
      lc.campaign_number as camp_number, 
      lc.end_date as camp_end_date
    FROM leaderboard_campaigns lc
    WHERE lc.id = v_campaign_id
  ),
  ranked_users AS (
    SELECT
      u.id,
      -- ✅ Use nickname if set, otherwise fall back to display_name
      COALESCE(NULLIF(u.nickname, ''), u.display_name, 'User ' || SUBSTRING(u.id::TEXT, 1, 8)) as user_display_name,
      u.email,
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
    ru.user_display_name AS display_name,
    ru.email,
    ru.level,
    ru.campaign_xp AS xp_in_campaign,
    ru.total_xp,
    ru.current_streak,
    ru.campaign_challenges AS challenges_in_campaign,
    ru.total_completed AS total_challenges_completed,
    ru.is_me AS is_current_user,
    ac.camp_number AS campaign_number,
    ac.camp_end_date::TEXT AS campaign_end_date
  FROM ranked_users ru
  CROSS JOIN active_campaign ac
  ORDER BY ru.user_rank;
END;
$$;

-- ============================================
-- FIX: Napraw get_my_campaign_position
-- ============================================

-- Usuń starą funkcję
DROP FUNCTION IF EXISTS get_my_campaign_position();

-- Utwórz poprawioną funkcję
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
SET search_path = public
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
      lc.id as camp_id,
      lc.campaign_number as camp_number,
      lc.end_date as camp_end_date,
      (lc.end_date - CURRENT_DATE) AS days_left
    FROM leaderboard_campaigns lc
    WHERE lc.id = v_campaign_id
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
    ROUND((au.user_rank::NUMERIC / NULLIF(tc.total, 0)) * 100, 1) AS percentile,
    ac.camp_number AS campaign_number,
    ac.days_left AS days_remaining
  FROM all_users au
  CROSS JOIN total_count tc
  CROSS JOIN active_campaign ac
  WHERE au.id = v_current_user_id;
END;
$$;

-- Test: sprawdź czy obie funkcje działają
SELECT 'Test funkcji get_campaign_leaderboard' as test;
SELECT * FROM get_campaign_leaderboard(10, 0);

SELECT 'Test funkcji get_my_campaign_position' as test;
SELECT * FROM get_my_campaign_position();

-- Test: sprawdź strukturę danych
SELECT 'Sprawdzenie campaign_user_stats' as test;
SELECT 
  COUNT(*) as total_users,
  SUM(xp_earned) as total_xp,
  MAX(xp_earned) as max_xp
FROM campaign_user_stats cus
JOIN leaderboard_campaigns lc ON cus.campaign_id = lc.id
WHERE lc.is_active = true;
