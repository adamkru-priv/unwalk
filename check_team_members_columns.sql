-- Check current structure of team_members table
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'team_members'
ORDER BY ordinal_position;

-- Check constraints
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'team_members'::regclass
  AND contype = 'c'
ORDER BY conname;
