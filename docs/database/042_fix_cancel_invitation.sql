-- ============================================
-- MOVEE: Fix Cancel Invitation - Add DELETE Policy
-- Migration 042
-- ============================================

-- Add DELETE policy for team_invitations
-- Allow users to delete their own sent invitations (only pending ones)
DROP POLICY IF EXISTS "Users can delete their sent invitations" ON team_invitations;
CREATE POLICY "Users can delete their sent invitations"
  ON team_invitations FOR DELETE
  USING (
    auth.uid() = sender_id 
    AND status = 'pending'
  );

-- Add DELETE policy for challenge_assignments  
-- Allow senders to delete pending assignments
DROP POLICY IF EXISTS "Senders can delete pending assignments" ON challenge_assignments;
CREATE POLICY "Senders can delete pending assignments"
  ON challenge_assignments FOR DELETE
  USING (
    auth.uid() = sender_id 
    AND status = 'pending'
  );

-- Comments
COMMENT ON POLICY "Users can delete their sent invitations" ON team_invitations 
IS 'Allow users to cancel (delete) their own pending invitations';

COMMENT ON POLICY "Senders can delete pending assignments" ON challenge_assignments 
IS 'Allow senders to cancel (delete) pending challenge assignments';
