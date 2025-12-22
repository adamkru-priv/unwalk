-- ============================================
-- MOVEE: Fix assigned_by column type
-- Migration 045
--
-- Fixes: assigned_by column in user_challenges was text instead of uuid
-- This caused errors when starting challenge assignments
-- ============================================

BEGIN;

-- Drop triggers temporarily
DROP TRIGGER IF EXISTS trg_push_challenge_assignment_started ON public.user_challenges;
DROP TRIGGER IF EXISTS trg_push_challenge_assignment_completed ON public.user_challenges;

-- Drop foreign key constraint
ALTER TABLE user_challenges 
DROP CONSTRAINT IF EXISTS user_challenges_assigned_by_fkey;

-- Change column type from text to uuid
ALTER TABLE user_challenges 
ALTER COLUMN assigned_by TYPE uuid USING assigned_by::uuid;

-- Re-add foreign key constraint
ALTER TABLE user_challenges 
ADD CONSTRAINT user_challenges_assigned_by_fkey 
FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL;

-- Recreate triggers
CREATE TRIGGER trg_push_challenge_assignment_started
  AFTER INSERT ON public.user_challenges
  FOR EACH ROW
  WHEN (NEW.assigned_by IS NOT NULL)
  EXECUTE FUNCTION public.enqueue_challenge_assignment_started_push();

CREATE TRIGGER trg_push_challenge_assignment_completed
  AFTER UPDATE ON public.user_challenges
  FOR EACH ROW
  WHEN (OLD.status = 'active' AND NEW.status = 'completed' AND NEW.assigned_by IS NOT NULL)
  EXECUTE FUNCTION public.enqueue_challenge_assignment_completed_push();

COMMIT;

-- Verify the fix
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_challenges' 
  AND column_name = 'assigned_by';
