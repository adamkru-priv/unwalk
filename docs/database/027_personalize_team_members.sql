-- ============================================
-- Personalize team members
-- Add custom names, relationships, and notes
-- ============================================

-- Add personalization fields to team_members
ALTER TABLE team_members
ADD COLUMN IF NOT EXISTS custom_name TEXT,
ADD COLUMN IF NOT EXISTS relationship TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_team_members_updated_at ON team_members;
CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Drop and recreate the my_team view with new fields
DROP VIEW IF EXISTS my_team;
CREATE VIEW my_team AS
SELECT 
  tm.id,
  tm.member_id,
  tm.custom_name,
  tm.relationship,
  tm.notes,
  u.email,
  u.display_name,
  u.avatar_url,
  u.tier,
  tm.added_at,
  -- Count their active challenges
  (SELECT COUNT(*) FROM user_challenges uc 
   WHERE uc.user_id = tm.member_id AND uc.status = 'active') as active_challenges_count
FROM team_members tm
JOIN public.users u ON tm.member_id = u.id
WHERE tm.user_id = auth.uid();

-- Add policy to allow users to update their team members' personalization
DROP POLICY IF EXISTS "Users can update their team members" ON team_members;
CREATE POLICY "Users can update their team members"
  ON team_members FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON COLUMN team_members.custom_name IS 'Custom display name set by the user (e.g., "Johnny" instead of email)';
COMMENT ON COLUMN team_members.relationship IS 'Relationship type (e.g., "Son", "Daughter", "Friend", "Partner")';
COMMENT ON COLUMN team_members.notes IS 'Optional notes about this team member';
