-- Migration: Add challenge target preference and team member limits
-- Description: Adds onboarding_target field and enforces team limits (basic: 1, pro: 5)

-- 1. Add onboarding_target field to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS onboarding_target VARCHAR(20) CHECK (onboarding_target IN ('self', 'spouse', 'child', 'friend'));

-- 2. Create function to check team member limits based on tier
CREATE OR REPLACE FUNCTION check_team_member_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  user_tier TEXT;
  max_members INTEGER;
BEGIN
  -- Get user's tier
  SELECT tier INTO user_tier
  FROM users
  WHERE id = NEW.user_id;

  -- Set max members based on tier
  IF user_tier = 'pro' THEN
    max_members := 5;
  ELSE
    max_members := 1;
  END IF;

  -- Count current team members
  SELECT COUNT(*) INTO current_count
  FROM team_members
  WHERE user_id = NEW.user_id;

  -- Check if limit exceeded
  IF current_count >= max_members THEN
    RAISE EXCEPTION 'Team member limit reached. % tier allows maximum % member(s).', user_tier, max_members;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create trigger to enforce team member limits
DROP TRIGGER IF EXISTS enforce_team_member_limit ON team_members;
CREATE TRIGGER enforce_team_member_limit
  BEFORE INSERT ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION check_team_member_limit();

-- 4. Add helper function to get team member count and limit
CREATE OR REPLACE FUNCTION get_team_member_stats(p_user_id UUID)
RETURNS TABLE(
  current_members INTEGER,
  max_members INTEGER,
  tier TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM team_members WHERE user_id = p_user_id),
    CASE 
      WHEN u.tier = 'pro' THEN 5
      ELSE 1
    END AS max_members,
    u.tier
  FROM users u
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Comment documentation
COMMENT ON COLUMN users.onboarding_target IS 'User''s initial challenge target choice: self, spouse, child, or friend';
COMMENT ON FUNCTION check_team_member_limit() IS 'Enforces team member limits: basic tier = 1 member, pro tier = 5 members';
COMMENT ON FUNCTION get_team_member_stats(UUID) IS 'Returns current team member count, limit, and user tier';
