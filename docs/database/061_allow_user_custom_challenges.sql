-- ============================================
-- MOVEE: Allow users to create custom challenges
-- Fix RLS policies for admin_challenges
-- ============================================

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Only service role can modify admin challenges" ON admin_challenges;
DROP POLICY IF EXISTS "Authenticated users can create custom challenges" ON admin_challenges;
DROP POLICY IF EXISTS "Users can update their own custom challenges" ON admin_challenges;
DROP POLICY IF EXISTS "Users can delete their own custom challenges" ON admin_challenges;
DROP POLICY IF EXISTS "Service role can manage all challenges" ON admin_challenges;
DROP POLICY IF EXISTS "Anyone can view active challenges" ON admin_challenges;

-- Add created_by_user_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_challenges' AND column_name = 'created_by_user_id'
  ) THEN
    ALTER TABLE admin_challenges ADD COLUMN created_by_user_id UUID REFERENCES auth.users(id);
    CREATE INDEX idx_admin_challenges_created_by_user_id ON admin_challenges(created_by_user_id);
  END IF;
END $$;

-- New policies: Allow authenticated users to INSERT their own custom challenges
CREATE POLICY "Authenticated users can create custom challenges"
  ON admin_challenges FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Users can update their own custom challenges
CREATE POLICY "Users can update their own custom challenges"
  ON admin_challenges FOR UPDATE
  TO authenticated
  USING (created_by_user_id = auth.uid());

-- Policy: Users can delete their own custom challenges
CREATE POLICY "Users can delete their own custom challenges"
  ON admin_challenges FOR DELETE
  TO authenticated
  USING (created_by_user_id = auth.uid());

-- Policy: Service role can still do everything (for admin operations)
CREATE POLICY "Service role can manage all challenges"
  ON admin_challenges FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Anyone (including anon) can view active challenges
CREATE POLICY "Anyone can view active challenges"
  ON admin_challenges FOR SELECT
  USING (is_active = true);

-- Add comment explaining the created_by_user_id column
COMMENT ON COLUMN admin_challenges.created_by_user_id IS 
  'NULL = system/admin challenge, UUID = user-created custom challenge';
