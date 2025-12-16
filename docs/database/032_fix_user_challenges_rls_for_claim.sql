-- ============================================
-- MOVEE: Fix user_challenges RLS for claiming
-- Migration 032
-- ============================================

-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update their own challenges" ON user_challenges;

-- Create new update policy that allows updates by user_id OR device_id
CREATE POLICY "Users can update their own challenges"
  ON user_challenges FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR (device_id IS NOT NULL AND device_id IN (
      SELECT device_id FROM public.users WHERE id = auth.uid()
    ))
  );

COMMENT ON POLICY "Users can update their own challenges" ON user_challenges IS 'Allows users to update challenges by user_id or device_id match';
