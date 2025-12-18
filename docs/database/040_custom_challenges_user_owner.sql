-- Migration: Persist Custom Challenges by Authenticated User
-- Date: 2025-12-18
-- Purpose:
-- 1) Add created_by_user_id to admin_challenges so custom challenges are tied to a stable auth user.
-- 2) Backfill it from existing data where possible.
-- 3) Tighten RLS so only the owner can update/delete their custom challenges.
-- 4) Keep public read access to active challenges.

BEGIN;

-- 1) Schema changes
ALTER TABLE public.admin_challenges
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_admin_challenges_custom_owner_user
  ON public.admin_challenges (created_by_user_id)
  WHERE is_custom = true AND created_by_user_id IS NOT NULL;

-- 2) Backfill (best-effort)
-- NOTE: If you have a users table that maps auth users, you can backfill based on history.
-- In this codebase, custom challenges were previously keyed by created_by_device_id.
-- There is no guaranteed mapping from device_id -> auth.uid() after logout on web.
-- So we only backfill when there is clear linkage via user_challenges.user_id.

UPDATE public.admin_challenges ac
SET created_by_user_id = uc.user_id
FROM (
  SELECT
    admin_challenge_id,
    (array_agg(user_id ORDER BY user_id DESC))[1] AS user_id
  FROM public.user_challenges
  WHERE user_id IS NOT NULL
  GROUP BY admin_challenge_id
) uc
WHERE ac.id = uc.admin_challenge_id
  AND ac.is_custom = true
  AND ac.created_by_user_id IS NULL;

-- 3) RLS policies
ALTER TABLE public.admin_challenges ENABLE ROW LEVEL SECURITY;

-- Public read (active challenges)
DROP POLICY IF EXISTS "Allow public read access to active challenges" ON public.admin_challenges;
CREATE POLICY "Allow public read access to active challenges"
ON public.admin_challenges
FOR SELECT
TO public
USING (is_active = true);

-- Insert policy: logged-in users can create custom challenges owned by themselves.
-- Guests (no auth.uid()) can still create custom challenges (owned by device_id); allow that too.
DROP POLICY IF EXISTS "Allow users to create custom challenges" ON public.admin_challenges;
CREATE POLICY "Allow users to create custom challenges"
ON public.admin_challenges
FOR INSERT
TO public
WITH CHECK (
  is_custom = true
  AND (
    (auth.uid() IS NOT NULL AND created_by_user_id = auth.uid())
    OR (auth.uid() IS NULL)
  )
);

-- Update policy: only owner can update.
-- If row has created_by_user_id set => must match auth.uid().
-- If row is legacy/guest (created_by_user_id is null) => allow update (keeps old behavior)
-- IMPORTANT: You can tighten the legacy path by also requiring created_by_device_id match,
-- but that requires using a Supabase JWT custom claim, which we don't have here.
DROP POLICY IF EXISTS "Allow users to update own custom challenges" ON public.admin_challenges;
CREATE POLICY "Allow users to update own custom challenges"
ON public.admin_challenges
FOR UPDATE
TO public
USING (
  is_custom = true
  AND (
    (created_by_user_id IS NOT NULL AND auth.uid() = created_by_user_id)
    OR (created_by_user_id IS NULL)
  )
)
WITH CHECK (
  is_custom = true
  AND (
    (created_by_user_id IS NOT NULL AND auth.uid() = created_by_user_id)
    OR (created_by_user_id IS NULL)
  )
);

-- Delete policy: only owner can delete.
DROP POLICY IF EXISTS "Allow users to delete own custom challenges" ON public.admin_challenges;
CREATE POLICY "Allow users to delete own custom challenges"
ON public.admin_challenges
FOR DELETE
TO public
USING (
  is_custom = true
  AND (
    (created_by_user_id IS NOT NULL AND auth.uid() = created_by_user_id)
    OR (created_by_user_id IS NULL)
  )
);

COMMIT;
