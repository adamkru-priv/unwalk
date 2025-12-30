-- Check what types are allowed in push_outbox
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'push_outbox'::regclass
AND conname = 'push_outbox_type_check';

-- Check existing types in push_outbox
SELECT DISTINCT type, COUNT(*) as count
FROM push_outbox
GROUP BY type
ORDER BY count DESC;
