-- Add 'distance' to allowed categories

-- Drop old constraint
ALTER TABLE admin_challenges 
DROP CONSTRAINT IF EXISTS admin_challenges_category_check;

-- Add new constraint with 'distance' included
ALTER TABLE admin_challenges 
ADD CONSTRAINT admin_challenges_category_check 
CHECK (category IN ('animals', 'sport', 'nature', 'surprise', 'distance'));
