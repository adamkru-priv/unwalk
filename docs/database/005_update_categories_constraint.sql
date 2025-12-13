-- Update category constraint to allow new categories: animals, sport, nature, surprise
-- Drop old constraint and add new one

ALTER TABLE admin_challenges 
DROP CONSTRAINT IF EXISTS admin_challenges_category_check;

ALTER TABLE admin_challenges 
ADD CONSTRAINT admin_challenges_category_check 
CHECK (category IN ('animals', 'sport', 'nature', 'surprise'));
