-- Check what XP-related tables exist
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%xp%'
ORDER BY table_name;

-- Check users table structure for XP columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
  AND column_name LIKE '%xp%'
ORDER BY ordinal_position;
