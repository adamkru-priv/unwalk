-- ============================================
-- Add time_limit_hours to admin_challenges
-- NULL = unlimited time
-- ============================================

-- Add time_limit_hours column (nullable - NULL means unlimited)
ALTER TABLE admin_challenges 
ADD COLUMN time_limit_hours INTEGER CHECK (time_limit_hours IS NULL OR time_limit_hours > 0);

-- Add comment
COMMENT ON COLUMN admin_challenges.time_limit_hours IS 'Time limit in hours for completing the challenge. NULL means unlimited time.';

-- Update some existing challenges with time limits (examples)
-- You can customize these values or remove this section
UPDATE admin_challenges 
SET time_limit_hours = 24 
WHERE difficulty = 'easy' AND time_limit_hours IS NULL;

UPDATE admin_challenges 
SET time_limit_hours = 72 
WHERE difficulty = 'medium' AND time_limit_hours IS NULL;

UPDATE admin_challenges 
SET time_limit_hours = 168 
WHERE difficulty = 'hard' AND time_limit_hours IS NULL;

-- Leave some challenges as unlimited (you can adjust this)
