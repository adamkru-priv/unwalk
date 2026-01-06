-- ========================================
-- Create leaderboard view
-- ========================================
-- This view shows user stats including today's steps
-- Uses the new daily_steps table
-- ========================================

CREATE OR REPLACE VIEW leaderboard AS
SELECT 
  u.id,
  u.email,
  u.display_name,
  u.nickname,
  u.xp,
  u.level,
  u.total_points,
  u.current_streak,
  u.longest_streak,
  
  -- Today's steps from daily_steps table
  COALESCE(ds_today.steps, 0) AS today_steps,
  
  -- Today's base XP (calculated from steps)
  COALESCE(FLOOR(ds_today.steps / 100.0) * 10, 0) AS today_base_xp,
  
  -- Total lifetime steps
  COALESCE(ds_total.total_steps, 0) AS total_lifetime_steps,
  
  -- Badges count
  COALESCE(b.badges_count, 0) AS badges_count

FROM users u

-- Left join today's steps
LEFT JOIN LATERAL (
  SELECT steps
  FROM daily_steps
  WHERE user_id = u.id
    AND date = CURRENT_DATE
  LIMIT 1
) ds_today ON true

-- Left join total lifetime steps
LEFT JOIN LATERAL (
  SELECT SUM(steps) as total_steps
  FROM daily_steps
  WHERE user_id = u.id
) ds_total ON true

-- Left join badges count
LEFT JOIN LATERAL (
  SELECT COUNT(*) as badges_count
  FROM user_badges
  WHERE user_id = u.id
) b ON true

ORDER BY u.xp DESC, today_steps DESC;

-- Grant access to authenticated users
GRANT SELECT ON leaderboard TO authenticated;
GRANT SELECT ON leaderboard TO anon;

COMMENT ON VIEW leaderboard IS 'Shows user rankings with today steps, lifetime steps, and badges. Updated in real-time from daily_steps table.';
