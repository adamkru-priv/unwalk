-- ============================================
-- Change Team Challenge Minimum Steps: 50k → 20k
-- ============================================

BEGIN;

-- 1. Update existing team challenges that are between 20k-50k
--    (currently these would be invalid, but let's keep them)
UPDATE public.admin_challenges
SET is_team_challenge = true
WHERE goal_steps >= 20000 
  AND goal_steps < 50000
  AND is_team_challenge = false;

-- 2. No database constraint to remove - the 50k limit is only in:
--    a) Frontend validation (AI generation)
--    b) Supabase Edge Function (ai-generate-challenge)

-- 3. Update any CHECK constraints if they exist
DO $$ 
BEGIN
  -- Check if there's a constraint on goal_steps for team challenges
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%team%' 
    AND table_name = 'admin_challenges'
  ) THEN
    RAISE NOTICE 'Found team challenge constraint - would need manual review';
  ELSE
    RAISE NOTICE 'No team challenge constraint found in database';
  END IF;
END $$;

COMMIT;

-- ============================================
-- VERIFICATION: Show team challenges by steps range
-- ============================================
SELECT 
  CASE 
    WHEN goal_steps < 20000 THEN '< 20k (INVALID for team)'
    WHEN goal_steps BETWEEN 20000 AND 49999 THEN '20k-50k (NEW VALID)'
    WHEN goal_steps >= 50000 THEN '50k+ (VALID)'
  END as step_range,
  COUNT(*) as count,
  MIN(goal_steps) as min_steps,
  MAX(goal_steps) as max_steps
FROM public.admin_challenges
WHERE is_team_challenge = true
GROUP BY 1
ORDER BY 3;
