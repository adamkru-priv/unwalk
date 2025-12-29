-- Fix the incorrect team_id foreign key constraint
-- team_id should NOT reference user_challenges.id - it should be a simple UUID for grouping

-- 1. Drop the INCORRECT foreign key constraint
ALTER TABLE public.user_challenges 
DROP CONSTRAINT IF EXISTS user_challenges_team_id_fkey;

-- 2. Verify it was dropped
SELECT 
  'Checking if constraint was removed...' AS status,
  COUNT(*) AS remaining_team_id_constraints
FROM information_schema.table_constraints 
WHERE table_name = 'user_challenges' 
  AND constraint_name = 'user_challenges_team_id_fkey';

-- 3. Create index for performance (team_id is now a simple grouping UUID)
CREATE INDEX IF NOT EXISTS idx_user_challenges_team_id 
ON public.user_challenges(team_id) 
WHERE team_id IS NOT NULL;

-- 4. Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Fixed team_id constraint!';
  RAISE NOTICE 'team_id is now a simple UUID for grouping team challenges';
  RAISE NOTICE 'Multiple users can share the same team_id to be in the same team';
END $$;
