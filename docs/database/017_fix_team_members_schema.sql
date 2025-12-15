-- Fix team_members table schema - remove invitation_id if exists
-- This column is not needed - team relationships are created directly

-- Drop invitation_id column if it exists
ALTER TABLE team_members 
DROP COLUMN IF EXISTS invitation_id;

-- Ensure correct structure
-- team_members should only have: id, user_id, member_id, added_at, created_at
ALTER TABLE team_members
DROP COLUMN IF EXISTS invitation_id CASCADE;

-- Recreate table with correct schema if needed
DROP TABLE IF EXISTS team_members CASCADE;

CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, member_id),
  CHECK (user_id != member_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_member ON team_members(member_id);

-- Enable RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their team" ON team_members;
CREATE POLICY "Users can view their team"
  ON team_members FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = member_id);

DROP POLICY IF EXISTS "Users can remove team members" ON team_members;
CREATE POLICY "Users can remove team members"
  ON team_members FOR DELETE
  USING (auth.uid() = user_id);

-- Allow inserting team members (for accept_team_invitation function)
DROP POLICY IF EXISTS "Allow inserting team members" ON team_members;
CREATE POLICY "Allow inserting team members"
  ON team_members FOR INSERT
  WITH CHECK (true); -- Function will handle security

COMMENT ON TABLE team_members IS 'Bidirectional team relationships';
COMMENT ON COLUMN team_members.user_id IS 'User who owns this team connection';
COMMENT ON COLUMN team_members.member_id IS 'Team member user ID';
