-- Migration: Remove guest user system
-- Author: System
-- Date: 2026-01-01
-- Description: Removes is_guest column and related guest user functionality

-- Step 1: Delete all guest users (they have no real data since auth is required)
DELETE FROM users WHERE is_guest = true;

-- Step 2: Drop is_guest column
ALTER TABLE users DROP COLUMN IF EXISTS is_guest;

-- Step 3: Drop guest-related functions (if they exist)
DROP FUNCTION IF EXISTS create_guest_user(text);
DROP FUNCTION IF EXISTS convert_guest_to_user(text, uuid, text);

-- Step 4: Update comments
COMMENT ON TABLE users IS 'User profiles - all users must be authenticated via Supabase Auth';

-- Step 5: Verify - show remaining users (should be 0 guest users)
SELECT COUNT(*) as total_users FROM users;

-- Done! Guest user system completely removed.
