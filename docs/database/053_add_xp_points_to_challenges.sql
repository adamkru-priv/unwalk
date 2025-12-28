-- ============================================
-- MOVEE: Dodaj kolumnę points (XP) do admin_challenges
-- Migration 053
-- ============================================
-- Dodaje XP rewards dla wszystkich challengów na podstawie goal_steps

BEGIN;

-- 1. Dodaj kolumnę points jeśli nie istnieje
ALTER TABLE public.admin_challenges 
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- 2. Oblicz i wypełnij XP dla wszystkich challengów na podstawie goal_steps
-- Formula: łagodny wzrost XP wraz z trudnością
UPDATE public.admin_challenges
SET points = CASE
  -- Easy (3000-7000 kroków): 25-100 XP
  WHEN goal_steps <= 3500 THEN 25
  WHEN goal_steps <= 4000 THEN 35
  WHEN goal_steps <= 5000 THEN 50
  WHEN goal_steps <= 6000 THEN 75
  WHEN goal_steps <= 7000 THEN 100
  
  -- Advanced (7500-12500 kroków): 150-350 XP
  WHEN goal_steps <= 8000 THEN 150
  WHEN goal_steps <= 9000 THEN 180
  WHEN goal_steps <= 10000 THEN 200
  WHEN goal_steps <= 11000 THEN 250
  WHEN goal_steps <= 12000 THEN 300
  WHEN goal_steps <= 12500 THEN 350
  
  -- Expert (13000+ kroków): 400-750 XP
  WHEN goal_steps <= 14000 THEN 400
  WHEN goal_steps <= 15000 THEN 450
  WHEN goal_steps <= 17500 THEN 500
  WHEN goal_steps <= 20000 THEN 600
  WHEN goal_steps <= 25000 THEN 700
  
  -- Extreme (25000+ kroków): 750+ XP
  ELSE 750
END
WHERE points = 0 OR points IS NULL;

-- 3. Ustaw NOT NULL constraint
ALTER TABLE public.admin_challenges 
ALTER COLUMN points SET NOT NULL;

-- 4. Dodaj index dla optymalizacji zapytań
CREATE INDEX IF NOT EXISTS idx_admin_challenges_points 
ON public.admin_challenges(points);

COMMIT;

-- ============================================
-- Podsumowanie
-- ============================================
DO $$
DECLARE
  v_count INTEGER;
  v_min_xp INTEGER;
  v_max_xp INTEGER;
BEGIN
  SELECT COUNT(*), MIN(points), MAX(points) 
  INTO v_count, v_min_xp, v_max_xp
  FROM admin_challenges;
  
  RAISE NOTICE '✅ XP points added to admin_challenges!';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  • Total challenges: %', v_count;
  RAISE NOTICE '  • XP range: % - % XP', v_min_xp, v_max_xp;
  RAISE NOTICE '';
  RAISE NOTICE 'XP Distribution:';
  RAISE NOTICE '  • Easy (3K-7K steps): 25-100 XP';
  RAISE NOTICE '  • Advanced (7.5K-12.5K steps): 150-350 XP';
  RAISE NOTICE '  • Expert (13K+ steps): 400-750 XP';
END $$;