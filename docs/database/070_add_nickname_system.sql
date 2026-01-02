-- ============================================
-- Add Nickname System
-- Allow users to set custom display names (max 9 chars)
-- Nicknames can be duplicated across users
-- ============================================

-- 1. Add nickname column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS nickname VARCHAR(9);

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname);

-- 3. Drop existing function before recreating
DROP FUNCTION IF EXISTS get_campaign_leaderboard(integer, integer);

-- 4. Update get_campaign_leaderboard to use nickname
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
BEGIN
  -- Get current authenticated user (NULL for guests)
  v_current_user_id := auth.uid();
  
  -- Calculate current campaign number (30-day cycles starting from epoch)
  v_campaign_number := FLOOR(EXTRACT(EPOCH FROM (CURRENT_DATE - DATE '2025-01-01')) / (30 * 86400))::INTEGER + 1;
  v_campaign_start_date := DATE '2025-01-01' + (v_campaign_number - 1) * INTERVAL '30 days';
  v_campaign_end_date := v_campaign_start_date + INTERVAL '29 days';
  
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

-- 5. Drop existing function before recreating
DROP FUNCTION IF EXISTS get_my_campaign_position();

-- 6. Update get_my_campaign_position to use nickname
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;
  
  v_campaign_number := FLOOR(EXTRACT(EPOCH FROM (CURRENT_DATE - DATE '2025-01-01')) / (30 * 86400))::INTEGER + 1;
  v_campaign_start_date := DATE '2025-01-01' + (v_campaign_number - 1) * INTERVAL '30 days';
  v_campaign_end_date := v_campaign_start_date + INTERVAL '29 days';
  
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

-- 7. Update my_team view to use nickname
DROP VIEW IF EXISTS my_team;
CREATE VIEW my_team AS
SELECT 
  tm.id,
  tm.member_id,
  tm.custom_name,
  tm.relationship,
  tm.notes,
  u.email,
  -- ✅ Use nickname if available, otherwise display_name
  COALESCE(NULLIF(u.nickname, ''), u.display_name, 'User ' || SUBSTRING(u.id::TEXT, 1, 8)) as display_name,
  u.avatar_url,
  u.tier,
  tm.added_at,
  -- Count their active challenges
  (SELECT COUNT(*) FROM user_challenges uc 
   WHERE uc.user_id = tm.member_id AND uc.status = 'active') as active_challenges_count
FROM team_members tm
JOIN public.users u ON tm.member_id = u.id
WHERE tm.user_id = auth.uid();

-- 8. Update my_sent_invitations view to use nickname
DROP VIEW IF EXISTS my_sent_invitations;
CREATE OR REPLACE VIEW my_sent_invitations AS
SELECT 
  ti.id,
  ti.sender_id,
  ti.recipient_email,
  ti.recipient_id,
  ti.status,
  ti.message,
  ti.invited_at,
  ti.responded_at,
  ti.expires_at,
  -- Recipient info (if registered)
  COALESCE(NULLIF(recipient.nickname, ''), recipient.display_name) as recipient_name,
  recipient.avatar_url as recipient_avatar
FROM team_invitations ti
LEFT JOIN users recipient ON ti.recipient_id = recipient.id
WHERE ti.sender_id = auth.uid()
ORDER BY ti.invited_at DESC;

-- 9. Update my_received_invitations view to use nickname
DROP VIEW IF EXISTS my_received_invitations;
CREATE OR REPLACE VIEW my_received_invitations AS
SELECT 
  ti.id,
  ti.sender_id,
  ti.recipient_email,
  ti.recipient_id,
  ti.status,
  ti.message,
  ti.invited_at,
  ti.responded_at,
  ti.expires_at,
  -- Sender info
  COALESCE(NULLIF(sender.nickname, ''), sender.display_name) as sender_name,
  sender.email as sender_email,
  sender.avatar_url as sender_avatar
FROM team_invitations ti
JOIN users sender ON ti.sender_id = sender.id
WHERE ti.recipient_id = auth.uid() OR ti.recipient_email = auth.email()
ORDER BY ti.invited_at DESC;
