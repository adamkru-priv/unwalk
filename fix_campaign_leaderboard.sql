-- ============================================
-- FIX: Naprawa funkcji get_campaign_leaderboard
-- Problem: błąd w obliczaniu numeru kampanii
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
  challenges_in_campaign BIGINT,
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
  v_campaign_number INTEGER;
  v_campaign_start_date DATE;
  v_campaign_end_date DATE;
  v_days_since_epoch INTEGER;
BEGIN
  -- Get current authenticated user (NULL for guests)
  v_current_user_id := auth.uid();
  
  -- ✅ FIX: Oblicz liczbę dni od początku (2025-01-01)
  v_days_since_epoch := (CURRENT_DATE - DATE '2025-01-01');
  
  -- Calculate current campaign number (30-day cycles)
  v_campaign_number := FLOOR(v_days_since_epoch / 30) + 1;
  v_campaign_start_date := DATE '2025-01-01' + ((v_campaign_number - 1) * 30);
  v_campaign_end_date := v_campaign_start_date + 29;
  
  RETURN QUERY
  WITH campaign_stats AS (
    SELECT
      u.id,
      -- ✅ Use nickname if set, otherwise fall back to display_name
      COALESCE(NULLIF(u.nickname, ''), u.display_name, 'User ' || SUBSTRING(u.id::TEXT, 1, 8)) as user_display_name,
      u.email,
      u.level,
      u.xp,
      u.current_streak,
      -- XP earned in current campaign
      COALESCE(SUM(x.xp_amount) FILTER (WHERE x.earned_at >= v_campaign_start_date AND x.earned_at < v_campaign_end_date + INTERVAL '1 day'), 0)::INTEGER as xp_in_campaign,
      -- Challenges completed in current campaign
      COUNT(DISTINCT uc.id) FILTER (WHERE uc.completed_at >= v_campaign_start_date AND uc.completed_at < v_campaign_end_date + INTERVAL '1 day') as challenges_in_campaign,
      -- Total challenges completed ever
      COUNT(DISTINCT uc.id) FILTER (WHERE uc.status = 'completed') as total_challenges_completed
    FROM users u
    LEFT JOIN xp_log x ON u.id = x.user_id
    LEFT JOIN user_challenges uc ON u.id = uc.user_id
    WHERE u.is_guest = false
    GROUP BY u.id, u.display_name, u.nickname, u.email, u.level, u.xp, u.current_streak
    HAVING COALESCE(SUM(x.xp_amount) FILTER (WHERE x.earned_at >= v_campaign_start_date AND x.earned_at < v_campaign_end_date + INTERVAL '1 day'), 0) > 0
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY cs.xp_in_campaign DESC, cs.level DESC) as rank,
    cs.id as user_id,
    cs.user_display_name as display_name,
    cs.email,
    cs.level,
    cs.xp_in_campaign,
    cs.xp as total_xp,
    cs.current_streak,
    cs.challenges_in_campaign,
    cs.total_challenges_completed,
    (cs.id = v_current_user_id) as is_current_user,
    v_campaign_number as campaign_number,
    v_campaign_end_date::TEXT as campaign_end_date
  FROM campaign_stats cs
  ORDER BY rank
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Usuń starą funkcję get_my_campaign_position
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
  v_user_id UUID;
  v_campaign_number INTEGER;
  v_campaign_start_date DATE;
  v_campaign_end_date DATE;
  v_days_since_epoch INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- ✅ FIX: Oblicz liczbę dni od początku
  v_days_since_epoch := (CURRENT_DATE - DATE '2025-01-01');
  
  v_campaign_number := FLOOR(v_days_since_epoch / 30) + 1;
  v_campaign_start_date := DATE '2025-01-01' + ((v_campaign_number - 1) * 30);
  v_campaign_end_date := v_campaign_start_date + 29;
  
  RETURN QUERY
  WITH campaign_stats AS (
    SELECT
      u.id,
      COALESCE(SUM(x.xp_amount) FILTER (WHERE x.earned_at >= v_campaign_start_date AND x.earned_at < v_campaign_end_date + INTERVAL '1 day'), 0)::INTEGER as xp_in_campaign
    FROM users u
    LEFT JOIN xp_log x ON u.id = x.user_id
    WHERE u.is_guest = false
    GROUP BY u.id
    HAVING COALESCE(SUM(x.xp_amount) FILTER (WHERE x.earned_at >= v_campaign_start_date AND x.earned_at < v_campaign_end_date + INTERVAL '1 day'), 0) > 0
  ),
  ranked AS (
    SELECT
      id,
      xp_in_campaign,
      ROW_NUMBER() OVER (ORDER BY xp_in_campaign DESC) as rank
    FROM campaign_stats
  ),
  totals AS (
    SELECT COUNT(*) as total FROM ranked
  )
  SELECT
    r.rank as my_rank,
    t.total as total_users,
    ROUND((r.rank::NUMERIC / NULLIF(t.total, 0) * 100), 1) as percentile,
    v_campaign_number as campaign_number,
    (v_campaign_end_date - CURRENT_DATE)::INTEGER + 1 as days_remaining
  FROM ranked r, totals t
  WHERE r.id = v_user_id;
END;
$$;

-- Test: sprawdź czy funkcja działa
SELECT 'Test funkcji get_campaign_leaderboard' as test;
SELECT * FROM get_campaign_leaderboard(5, 0);

SELECT 'Test funkcji get_my_campaign_position' as test;
SELECT * FROM get_my_campaign_position();
