-- ============================================
-- Fix RLS policies for challenge assignments
-- Allow recipients to create user_challenges
-- ============================================

-- Drop old policy
DROP POLICY IF EXISTS "Users can create their own challenges" ON user_challenges;

-- New policy: Allow creating challenges for yourself OR via accepted assignment
CREATE POLICY "Users can create their own challenges"
  ON user_challenges FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

-- Make sure UPDATE policy allows recipient to update assignment status
DROP POLICY IF EXISTS "Recipients can update challenge assignments" ON challenge_assignments;
CREATE POLICY "Recipients can update challenge assignments"
  ON challenge_assignments FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

COMMENT ON POLICY "Users can create their own challenges" ON user_challenges 
IS 'Users can create challenges for themselves (including from accepted assignments)';
