-- Fix team_id foreign key constraint issue
-- team_id should be a simple UUID for grouping, not a foreign key

-- 1. Check current constraint
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'user_challenges'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'team_id';

-- 2. Drop the incorrect foreign key constraint
ALTER TABLE public.user_challenges 
DROP CONSTRAINT IF EXISTS user_challenges_team_ci_fkey;

-- 3. Verify team_id column exists and is nullable
DO $$ 
BEGIN
  -- Check if team_id column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_challenges' 
      AND column_name = 'team_id'
  ) THEN
    -- Add team_id column if it doesn't exist
    ALTER TABLE public.user_challenges 
    ADD COLUMN team_id UUID;
    
    RAISE NOTICE '✅ Added team_id column';
  ELSE
    RAISE NOTICE 'ℹ️ team_id column already exists';
  END IF;
END $$;

-- 4. Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_challenges_team_id 
ON public.user_challenges(team_id) 
WHERE team_id IS NOT NULL;

-- 5. Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Fixed team_id constraint issue';
  RAISE NOTICE 'team_id is now a simple UUID column (no foreign key)';
  RAISE NOTICE 'Team challenges will be grouped by matching team_id values';
END $$;
