-- 1. Sprawdź czy to zaproszenie w ogóle istnieje
SELECT 
  id,
  invited_by,
  invited_user,
  challenge_id,
  status,
  created_at
FROM team_challenge_invitations
WHERE id = 'a90ef2d1-381f-49a6-ae79-04daf1463e43';

-- 2. Sprawdź wszystkie pending invitations
SELECT 
  id,
  invited_by,
  invited_user,
  challenge_id,
  status,
  created_at
FROM team_challenge_invitations
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Spróbuj DELETE bez WHERE (żeby zobaczyć czy w ogóle coś jest)
-- ⚠️ NIE URUCHAMIAJ TEGO - tylko zobacz count
SELECT COUNT(*) as total_invitations
FROM team_challenge_invitations;

-- 4. Spróbuj usunąć najnowsze pending invitation
DELETE FROM team_challenge_invitations
WHERE status = 'pending'
  AND id = (
    SELECT id 
    FROM team_challenge_invitations 
    WHERE status = 'pending' 
    ORDER BY created_at DESC 
    LIMIT 1
  )
RETURNING *;
