-- Check all constraints on team_members table
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'team_members'::regclass
ORDER BY conname;
