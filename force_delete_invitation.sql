-- ========================================
-- 🔥 FORCE DELETE - obejście RLS
-- ========================================

-- 1. Usuń rekord jako postgres (pomija RLS)
BEGIN;

SET LOCAL role postgres;

DELETE FROM team_challenge_invitations
WHERE id = 'a90ef2d1-381f-49a6-ae79-04daf1463e43'
RETURNING *;

RESET ROLE;

COMMIT;

-- Jeśli powyższe nie zadziałało, spróbuj bez transakcji:

-- 2. Sprawdź czy są jakieś INSTEAD OF triggery (na view?)
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'team_challenge_invitations';

-- 3. Spróbuj UPDATE zamiast DELETE (test czy działa UPDATE)
UPDATE team_challenge_invitations
SET status = 'cancelled'
WHERE id = 'a90ef2d1-381f-49a6-ae79-04daf1463e43'
RETURNING *;
