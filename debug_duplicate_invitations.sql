-- Sprawdź czy są duplikaty zaproszeń dla tego samego challenge
SELECT 
  tm.id,
  tm.user_id as host_id,
  tm.member_id,
  tm.challenge_status,
  tm.active_challenge_id,
  host.email as host_email,
  member.email as member_email,
  ac.title as challenge_title
FROM team_members tm
JOIN users host ON tm.user_id = host.id
JOIN users member ON tm.member_id = member.id
LEFT JOIN admin_challenges ac ON tm.active_challenge_id = ac.id
WHERE tm.active_challenge_id IS NOT NULL
  AND tm.challenge_status IN ('invited', 'accepted')
ORDER BY tm.active_challenge_id, tm.member_id, tm.created_at;

-- Sprawdź czy są duplikaty dla konkretnego użytkownika
SELECT 
  member_id,
  active_challenge_id,
  challenge_status,
  COUNT(*) as count
FROM team_members
WHERE active_challenge_id IS NOT NULL
  AND challenge_status = 'invited'
GROUP BY member_id, active_challenge_id, challenge_status
HAVING COUNT(*) > 1;
