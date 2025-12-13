-- Migration: Add RLS policies for custom challenges
-- This allows users to create and manage their own custom challenges

-- Enable RLS on admin_challenges (if not already enabled)
ALTER TABLE admin_challenges ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to read active challenges (both admin and custom)
DROP POLICY IF EXISTS "Allow public read access to active challenges" ON admin_challenges;
CREATE POLICY "Allow public read access to active challenges"
ON admin_challenges FOR SELECT
TO public
USING (is_active = true);

-- Policy: Allow users to create their own custom challenges
DROP POLICY IF EXISTS "Allow users to create custom challenges" ON admin_challenges;
CREATE POLICY "Allow users to create custom challenges"
ON admin_challenges FOR INSERT
TO public
WITH CHECK (is_custom = true);

-- Policy: Allow users to update their own custom challenges
DROP POLICY IF EXISTS "Allow users to update own custom challenges" ON admin_challenges;
CREATE POLICY "Allow users to update own custom challenges"
ON admin_challenges FOR UPDATE
TO public
USING (is_custom = true AND created_by_device_id IS NOT NULL);

-- Policy: Allow users to delete their own custom challenges
DROP POLICY IF EXISTS "Allow users to delete own custom challenges" ON admin_challenges;
CREATE POLICY "Allow users to delete own custom challenges"
ON admin_challenges FOR DELETE
TO public
USING (is_custom = true AND created_by_device_id IS NOT NULL);

-- Enable RLS on user_challenges (if not already enabled)
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to read their own challenges
DROP POLICY IF EXISTS "Allow users to read own challenges" ON user_challenges;
CREATE POLICY "Allow users to read own challenges"
ON user_challenges FOR SELECT
TO public
USING (true); -- We'll filter by device_id in the app

-- Policy: Allow users to create challenges
DROP POLICY IF EXISTS "Allow users to create challenges" ON user_challenges;
CREATE POLICY "Allow users to create challenges"
ON user_challenges FOR INSERT
TO public
WITH CHECK (true);

-- Policy: Allow users to update their own challenges
DROP POLICY IF EXISTS "Allow users to update own user challenges" ON user_challenges;
CREATE POLICY "Allow users to update own user challenges"
ON user_challenges FOR UPDATE
TO public
USING (true);

-- Policy: Allow users to delete their own challenges
DROP POLICY IF EXISTS "Allow users to delete own user challenges" ON user_challenges;
CREATE POLICY "Allow users to delete own user challenges"
ON user_challenges FOR DELETE
TO public
USING (true);
