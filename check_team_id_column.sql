-- Check if team_id column exists and its properties
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_challenges'
  AND column_name = 'team_id';

-- Also check all columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_challenges'
ORDER BY ordinal_position;
