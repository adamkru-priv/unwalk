-- Step 1: Update existing records to match new categories
-- Map old categories to new ones

-- Update 'cities' -> 'surprise'
UPDATE admin_challenges 
SET category = 'surprise' 
WHERE category = 'cities';

-- Update 'art' -> 'surprise'
UPDATE admin_challenges 
SET category = 'surprise' 
WHERE category = 'art';

-- 'nature' stays as 'nature' (already valid)

-- Step 2: Drop old constraint
ALTER TABLE admin_challenges 
DROP CONSTRAINT IF EXISTS admin_challenges_category_check;

-- Step 3: Add new constraint with new categories
ALTER TABLE admin_challenges 
ADD CONSTRAINT admin_challenges_category_check 
CHECK (category IN ('animals', 'sport', 'nature', 'surprise'));
