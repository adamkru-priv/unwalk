-- ============================================
-- MOVEE: Simplify account model to Guest vs Pro
-- Migration 039
-- ============================================

-- 1) Migrate any existing basic users to pro
UPDATE public.users
SET tier = 'pro'
WHERE tier = 'basic';

-- 2) Ensure Pro is the default tier
ALTER TABLE public.users
  ALTER COLUMN tier SET DEFAULT 'pro';

-- 3) Tighten allowed values (only 'pro')
-- Drop existing CHECK constraint if it exists (name may vary), then re-add.
DO $$
BEGIN
  -- common names used by Postgres for inline checks vary; try both patterns.
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND contype = 'c'
      AND conname = 'users_tier_check'
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT users_tier_check;
  END IF;
EXCEPTION WHEN undefined_object THEN
  -- ignore
END $$;

ALTER TABLE public.users
  ADD CONSTRAINT users_tier_check CHECK (tier IN ('pro'));

-- 4) Optional: if you want guests to always be tier=pro as well (keeps code simpler)
UPDATE public.users
SET tier = 'pro'
WHERE is_guest = true;

-- Notes:
-- - Some functions/indexes reference tier='pro' already, so this is compatible.
-- - If you later introduce paid plans, relax the CHECK constraint and reintroduce more tiers.
