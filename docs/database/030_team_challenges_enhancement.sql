-- ============================================================
-- Migration 030: Team Challenges Enhancement
-- ============================================================
-- Adds support for dedicated team challenges with:
-- - Flag to mark challenges as team-only
-- - Minimum team size requirement
-- - Double XP rewards for team challenges
-- - Time limits (deadlines) are mandatory for team challenges
-- ============================================================

-- 1. Add team challenge columns to admin_challenges
ALTER TABLE admin_challenges
ADD COLUMN IF NOT EXISTS is_team_challenge BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS min_team_size INTEGER DEFAULT 2;

-- 2. Add comment explaining the columns
COMMENT ON COLUMN admin_challenges.is_team_challenge IS 
  'If true, this challenge can only be done as a team (50k+ steps, 2x XP)';
COMMENT ON COLUMN admin_challenges.min_team_size IS 
  'Minimum number of participants required for team challenge (default: 2)';

-- 3. Add constraint: Team challenges must have goals >= 50k steps
ALTER TABLE admin_challenges
ADD CONSTRAINT team_challenge_min_steps 
CHECK (
  NOT is_team_challenge 
  OR (is_team_challenge AND goal_steps >= 50000)
);

-- 4. Add constraint: Team challenges must have time limit
ALTER TABLE admin_challenges
ADD CONSTRAINT team_challenge_requires_deadline
CHECK (
  NOT is_team_challenge 
  OR (is_team_challenge AND time_limit_hours > 0)
);

-- 5. Add index for filtering team challenges
CREATE INDEX IF NOT EXISTS idx_admin_challenges_team 
ON admin_challenges(is_team_challenge) 
WHERE is_team_challenge = true;

-- 6. Update existing challenges - mark large challenges as team-eligible
UPDATE admin_challenges
SET is_team_challenge = true,
    points = points * 2  -- Double XP for team challenges!
WHERE goal_steps >= 50000 
  AND time_limit_hours > 0
  AND NOT is_team_challenge;

-- 7. Add column to track team challenge participation
ALTER TABLE user_challenges
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES user_challenges(id) ON DELETE SET NULL;

COMMENT ON COLUMN user_challenges.team_id IS 
  'If set, links this user_challenge to a parent team challenge for XP distribution';

-- 8. Create view for team challenge leaderboard
CREATE OR REPLACE VIEW team_challenge_leaderboard AS
WITH team_totals AS (
  SELECT 
    uc.id as challenge_id,
    uc.admin_challenge_id,
    SUM(ucm.current_steps) as total_steps
  FROM user_challenges uc
  JOIN admin_challenges ac ON ac.id = uc.admin_challenge_id
  JOIN user_challenges ucm ON ucm.team_id = uc.id OR ucm.id = uc.id
  WHERE ac.is_team_challenge = true
    AND uc.status = 'active'
  GROUP BY uc.id, uc.admin_challenge_id
)
SELECT 
  uc.id as challenge_id,
  uc.admin_challenge_id,
  ac.title,
  ac.image_url,
  ac.goal_steps,
  ac.points as total_xp,
  COUNT(DISTINCT ucm.user_id) as team_size,
  tt.total_steps,
  ROUND(tt.total_steps::numeric / ac.goal_steps * 100, 1) as progress_percentage,
  array_agg(
    json_build_object(
      'user_id', ucm.user_id,
      'display_name', u.display_name,
      'avatar_url', u.avatar_url,
      'steps', ucm.current_steps,
      'percentage', ROUND(ucm.current_steps::numeric / NULLIF(tt.total_steps, 0) * 100, 1),
      'xp_earned', ROUND(ac.points * (ucm.current_steps::numeric / NULLIF(tt.total_steps, 0)))
    ) ORDER BY ucm.current_steps DESC
  ) as contributors
FROM user_challenges uc
JOIN admin_challenges ac ON ac.id = uc.admin_challenge_id
JOIN user_challenges ucm ON ucm.team_id = uc.id OR ucm.id = uc.id
JOIN users u ON u.id = ucm.user_id
JOIN team_totals tt ON tt.challenge_id = uc.id
WHERE ac.is_team_challenge = true
  AND uc.status = 'active'
GROUP BY uc.id, uc.admin_challenge_id, ac.title, ac.image_url, ac.goal_steps, ac.points, tt.total_steps;

-- 9. Grant access to the view
GRANT SELECT ON team_challenge_leaderboard TO authenticated;
GRANT SELECT ON team_challenge_leaderboard TO anon;

-- 10. Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Migration 030 complete: Team challenges enhanced!';
  RAISE NOTICE '   - Team challenges require 50k+ steps';
  RAISE NOTICE '   - Team challenges have 2x XP rewards';
  RAISE NOTICE '   - Team challenges require deadlines';
  RAISE NOTICE '   - Use team_challenge_leaderboard view for progress tracking';
END $$;
