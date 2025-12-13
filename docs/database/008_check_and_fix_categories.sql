-- First, let's see what categories exist in the database
SELECT category, COUNT(*) as count
FROM admin_challenges 
GROUP BY category
ORDER BY count DESC;

-- This will show us what needs to be mapped
