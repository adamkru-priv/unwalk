-- ========================================
-- 🔍 Sprawdź co blokuje DELETE
-- ========================================

-- 1. Sprawdź triggery na team_challenge_invitations
SELECT 
  trigger_name,
  event_manipulation as trigger_event,
  action_timing as when_fires,
  action_statement as trigger_code
FROM information_schema.triggers
WHERE event_object_table = 'team_challenge_invitations'
ORDER BY event_manipulation, action_timing;

-- 2. Sprawdź foreign key constraints (które mogą blokować DELETE)
SELECT
  tc.table_name as source_table,
  kcu.column_name as source_column,
  ccu.table_name AS target_table,
  ccu.column_name AS target_column,
  tc.constraint_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
LEFT JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'team_challenge_invitations';

-- 3. Spróbuj FORCE DELETE (wyłącz triggery)
ALTER TABLE team_challenge_invitations DISABLE TRIGGER ALL;

DELETE FROM team_challenge_invitations
WHERE id = 'a90ef2d1-381f-49a6-ae79-04daf1463e43'
RETURNING *;

ALTER TABLE team_challenge_invitations ENABLE TRIGGER ALL;

-- 4. Jeśli powyższe nie zadziałało, sprawdź czy tabela ma RULE
SELECT 
  schemaname,
  tablename,
  rulename,
  definition
FROM pg_rules
WHERE tablename = 'team_challenge_invitations'
  AND ev_type = 'DELETE';
