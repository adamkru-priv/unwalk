-- ============================================
-- Remove 50k constraint and add 20k constraint for team challenges
-- ============================================

BEGIN;

-- 1. First, check what constraint exists
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname LIKE '%team%'
  AND conrelid = 'public.admin_challenges'::regclass;

-- 2. Drop the old constraint (50k minimum)
ALTER TABLE public.admin_challenges 
DROP CONSTRAINT IF EXISTS team_challenge_min_steps;

-- 3. Add new constraint (20k minimum)
ALTER TABLE public.admin_challenges
ADD CONSTRAINT team_challenge_min_steps 
CHECK (
  (is_team_challenge = false) OR 
  (is_team_challenge = true AND goal_steps >= 20000)
);

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'team_challenge_min_steps'
  AND conrelid = 'public.admin_challenges'::regclass;

-- Show team challenges that would now be valid (20k-50k range)
SELECT 
  id,
  title,
  goal_steps,
  is_team_challenge,
  CASE 
    WHEN goal_steps < 20000 THEN '❌ INVALID (< 20k)'
    WHEN goal_steps BETWEEN 20000 AND 49999 THEN '✅ NOW VALID (20k-50k)'
    WHEN goal_steps >= 50000 THEN '✅ ALREADY VALID (50k+)'
  END as status
FROM public.admin_challenges
WHERE is_team_challenge = true
ORDER BY goal_steps;
