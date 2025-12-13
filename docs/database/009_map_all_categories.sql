-- Map ALL existing categories to new ones, then update constraint

-- Step 1: Drop constraint first
ALTER TABLE admin_challenges 
DROP CONSTRAINT IF EXISTS admin_challenges_category_check;

-- Step 2: Map old categories to new ones
-- fun -> surprise
UPDATE admin_challenges 
SET category = 'surprise' 
WHERE category = 'fun';

-- travel -> nature
UPDATE admin_challenges 
SET category = 'nature' 
WHERE category = 'travel';

-- art -> surprise
UPDATE admin_challenges 
SET category = 'surprise' 
WHERE category = 'art';

-- motivation -> sport
UPDATE admin_challenges 
SET category = 'sport' 
WHERE category = 'motivation';

-- Step 3: Add new constraint
ALTER TABLE admin_challenges 
ADD CONSTRAINT admin_challenges_category_check 
CHECK (category IN ('animals', 'sport', 'nature', 'surprise'));

-- Step 4: Verify the result
SELECT category, COUNT(*) as count
FROM admin_challenges 
GROUP BY category
ORDER BY category;
