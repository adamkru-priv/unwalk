-- Sprawdź CHECK constraint dla kolumny status
SELECT
  con.conname as constraint_name,
  pg_get_constraintdef(con.oid) as constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'team_challenge_invitations'
  AND con.contype = 'c';  -- CHECK constraint

-- Sprawdź kolumnę status (typ, default, nullable)
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'team_challenge_invitations'
  AND column_name = 'status';
