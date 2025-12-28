-- ============================================
-- Migration 058: Team Challenge Invitations Table
-- ============================================
-- Creates table for sending and managing team challenge invitations

BEGIN;

-- Create team_challenge_invitations table
CREATE TABLE IF NOT EXISTS team_challenge_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_user UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES admin_challenges(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate invitations
  UNIQUE(invited_user, challenge_id, invited_by)
);

-- Add comments
COMMENT ON TABLE team_challenge_invitations IS 'Stores team challenge invitations between users';
COMMENT ON COLUMN team_challenge_invitations.invited_by IS 'User who sent the invitation';
COMMENT ON COLUMN team_challenge_invitations.invited_user IS 'User who received the invitation';
COMMENT ON COLUMN team_challenge_invitations.challenge_id IS 'Challenge being invited to';
COMMENT ON COLUMN team_challenge_invitations.status IS 'Current status of invitation';

-- Create indexes
CREATE INDEX idx_invitations_invited_user ON team_challenge_invitations(invited_user, status);
CREATE INDEX idx_invitations_invited_by ON team_challenge_invitations(invited_by);
CREATE INDEX idx_invitations_challenge ON team_challenge_invitations(challenge_id);
CREATE INDEX idx_invitations_status ON team_challenge_invitations(status);

-- Auto-update trigger
CREATE TRIGGER update_team_invitations_updated_at
  BEFORE UPDATE ON team_challenge_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE team_challenge_invitations ENABLE ROW LEVEL SECURITY;

-- Users can view invitations they sent or received
CREATE POLICY "Users can view their invitations"
  ON team_challenge_invitations FOR SELECT
  USING (auth.uid() = invited_by OR auth.uid() = invited_user);

-- Users can create invitations (only their own)
CREATE POLICY "Users can create invitations"
  ON team_challenge_invitations FOR INSERT
  WITH CHECK (auth.uid() = invited_by);

-- Users can update invitations they received (accept/reject)
CREATE POLICY "Users can respond to their invitations"
  ON team_challenge_invitations FOR UPDATE
  USING (auth.uid() = invited_user)
  WITH CHECK (auth.uid() = invited_user);

-- Service role can do everything (for admin operations)
CREATE POLICY "Service role full access"
  ON team_challenge_invitations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMIT;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Migration 058 complete: Team challenge invitations table created!';
END $$;
