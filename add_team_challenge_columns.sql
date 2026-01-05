-- Add team challenge columns to team_members table

ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS active_challenge_id UUID REFERENCES admin_challenges(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS challenge_role TEXT CHECK (challenge_role IN ('host', 'member')),
ADD COLUMN IF NOT EXISTS challenge_status TEXT CHECK (challenge_status IN ('invited', 'accepted', 'declined')),
ADD COLUMN IF NOT EXISTS invited_to_challenge_at TIMESTAMPTZ;

-- Add index for querying by challenge
CREATE INDEX IF NOT EXISTS idx_team_members_active_challenge ON team_members(active_challenge_id);

-- Add index for querying invitations
CREATE INDEX IF NOT EXISTS idx_team_members_challenge_status ON team_members(challenge_status) WHERE challenge_status = 'invited';

COMMENT ON COLUMN team_members.active_challenge_id IS 'Current active team challenge ID';
COMMENT ON COLUMN team_members.challenge_role IS 'Role in team challenge: host or member';
COMMENT ON COLUMN team_members.challenge_status IS 'Challenge invitation status: invited, accepted, declined';
COMMENT ON COLUMN team_members.invited_to_challenge_at IS 'When user was invited to the challenge';
