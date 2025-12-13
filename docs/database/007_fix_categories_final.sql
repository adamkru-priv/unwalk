-- IMPORTANT: Run this ENTIRE script as ONE transaction in Supabase SQL Editor

-- Step 1: Drop the constraint first (so we can update data freely)
ALTER TABLE admin_challenges 
DROP CONSTRAINT IF EXISTS admin_challenges_category_check;

-- Step 2: Now update existing records to match new categories
UPDATE admin_challenges 
SET category = 'surprise' 
WHERE category IN ('cities', 'art', 'surprise');

UPDATE admin_challenges 
SET category = 'nature' 
WHERE category = 'nature';

-- Step 3: Add new constraint with ONLY the 4 new categories
ALTER TABLE admin_challenges 
ADD CONSTRAINT admin_challenges_category_check 
CHECK (category IN ('animals', 'sport', 'nature', 'surprise'));

-- Verify the change
SELECT DISTINCT category, COUNT(*) 
FROM admin_challenges 
GROUP BY category;
