-- Sprawdź ograniczenia (constraints) na tabeli admin_challenges
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
JOIN pg_class cl ON cl.oid = c.conrelid
WHERE cl.relname = 'admin_challenges'
  AND n.nspname = 'public';

-- Sprawdź typy kolumn w admin_challenges
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  numeric_precision,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'admin_challenges'
  AND column_name IN ('goal_steps', 'time_limit_hours', 'points', 'difficulty');
