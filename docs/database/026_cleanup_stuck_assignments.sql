-- ============================================
-- Cleanup stuck challenge assignments
-- ============================================

-- Temporarily disable RLS to delete stuck records
ALTER TABLE challenge_assignments DISABLE ROW LEVEL SECURITY;

-- Delete the 2 problematic assignments
-- Option 1: Delete specific IDs (replace with actual IDs from screenshot)
DELETE FROM challenge_assignments 
WHERE id IN (
  '0b7d4392-84cf-4431-9905-7a56e19fb5ff',
  'd8b6e3ab-4316-4c4a-bbce-c011cb914ed4'
);

-- OR Option 2: Delete all accepted assignments without user_challenge_id (stuck in limbo)
-- DELETE FROM challenge_assignments 
-- WHERE status = 'accepted' 
-- AND user_challenge_id IS NULL;

-- Re-enable RLS
ALTER TABLE challenge_assignments ENABLE ROW LEVEL SECURITY;

-- Add a new policy to allow recipients to delete their received assignments
DROP POLICY IF EXISTS "Recipients can delete their assignments" ON challenge_assignments;
CREATE POLICY "Recipients can delete their assignments"
  ON challenge_assignments FOR DELETE
  USING (auth.uid() = recipient_id);

COMMENT ON POLICY "Recipients can delete their assignments" ON challenge_assignments 
IS 'Recipients can delete challenge assignments they received (any status)';

-- Verify - check remaining assignments
SELECT 
  id,
  sender_id,
  recipient_id,
  status,
  user_challenge_id,
  sent_at
FROM challenge_assignments
ORDER BY sent_at DESC;
