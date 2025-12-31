-- Debug: Sprawdź status zaproszenia dla Adam C4E
SELECT 
  tm.id,
  tm.challenge_status,
  tm.active_challenge_id,
  tm.invited_to_challenge_at,
  host.email as host_email,
  member.email as member_email,
  ac.title as challenge_title
FROM team_members tm
JOIN users host ON host.id = tm.user_id
JOIN users member ON member.id = tm.member_id
LEFT JOIN admin_challenges ac ON ac.id = tm.active_challenge_id
WHERE member.email = 'adamc4e@testapp.com'
  AND tm.active_challenge_id IS NOT NULL
ORDER BY tm.invited_to_challenge_at DESC;

-- Sprawdź user_challenges dla Adam C4E
SELECT 
  uc.id,
  uc.admin_challenge_id,
  uc.status,
  uc.current_steps,
  uc.started_at,
  ac.title as challenge_title
FROM user_challenges uc
JOIN users u ON u.id = uc.user_id
JOIN admin_challenges ac ON ac.id = uc.admin_challenge_id
WHERE u.email = 'adamc4e@testapp.com'
  AND uc.status = 'active'
ORDER BY uc.started_at DESC;
