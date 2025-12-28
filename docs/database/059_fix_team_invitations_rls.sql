-- ============================================
-- Migration 059: Fix Team Challenge Invitations RLS Policies
-- ============================================
-- Fixes RLS policies to allow proper upsert operations

BEGIN;

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Users can view invitations they sent" ON team_challenge_invitations;
DROP POLICY IF EXISTS "Users can view invitations they received" ON team_challenge_invitations;
DROP POLICY IF EXISTS "Users can create invitations" ON team_challenge_invitations;
DROP POLICY IF EXISTS "Users can respond to their invitations" ON team_challenge_invitations;
DROP POLICY IF EXISTS "Service role full access" ON team_challenge_invitations;

-- Create new combined policies that work with upsert

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

-- Users can update invitations they sent (for upsert to work)
CREATE POLICY "Users can update their sent invitations"
  ON team_challenge_invitations FOR UPDATE
  USING (auth.uid() = invited_by)
  WITH CHECK (auth.uid() = invited_by);

-- Service role can do everything (for admin operations)
CREATE POLICY "Service role full access"
  ON team_challenge_invitations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMIT;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Migration 059 complete: Team challenge invitations RLS policies fixed!';
  RAISE NOTICE '   Now upsert operations should work correctly';
END $$;
