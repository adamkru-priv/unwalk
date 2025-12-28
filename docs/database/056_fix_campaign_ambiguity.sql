-- ============================================
-- FIX: Campaign Leaderboard Ambiguity
-- ============================================
-- Naprawia błąd "column reference campaign_number is ambiguous"

BEGIN;

-- Fix get_my_campaign_position() - dodaj aliasy
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
      lc.id, 
      lc.campaign_number AS camp_num,  -- ✅ Alias żeby uniknąć konfliktu
      lc.end_date,
      lc.end_date - CURRENT_DATE AS days_left
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
    ROUND((au.user_rank::NUMERIC / tc.total::NUMERIC) * 100, 1) AS percentile,
    ac.camp_num AS campaign_number,  -- ✅ Używamy aliasu
    ac.days_left AS days_remaining
  FROM all_users au
  CROSS JOIN total_count tc
  CROSS JOIN active_campaign ac
  WHERE au.id = v_current_user_id;
END;
$$;

-- Fix get_campaign_leaderboard() - dodaj aliasy
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
    SELECT 
      lc.id, 
      lc.campaign_number AS camp_num,  -- ✅ Alias
      lc.end_date
    FROM leaderboard_campaigns lc
    WHERE lc.id = v_campaign_id
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
    ac.camp_num AS campaign_number,  -- ✅ Używamy aliasu
    ac.end_date AS campaign_end_date
  FROM ranked_users ru
  CROSS JOIN active_campaign ac
  ORDER BY ru.user_rank;
END;
$$;

COMMIT;

-- Test
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed column ambiguity in campaign functions!';
END $$;
