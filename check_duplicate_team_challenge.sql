-- Sprawdź duplikaty Adam C4E w Easy Challenge
SELECT 
  uc.id,
  u.email,
  u.display_name,
  ac.title as challenge_title,
  uc.team_id,
  uc.status,
  uc.current_steps,
  uc.started_at,
  uc.last_resumed_at
FROM user_challenges uc
JOIN users u ON u.id = uc.user_id
JOIN admin_challenges ac ON ac.id = uc.admin_challenge_id
WHERE u.email = 'adamc4e@testapp.com'
  AND uc.status = 'active'
  AND ac.title = 'Easy Challenge'
ORDER BY uc.started_at;

-- Sprawdź team_id - czy są różne czy takie same
SELECT 
  team_id,
  COUNT(*) as count,
  array_agg(u.email) as users
FROM user_challenges uc
JOIN users u ON u.id = uc.user_id
JOIN admin_challenges ac ON ac.id = uc.admin_challenge_id
WHERE ac.title = 'Easy Challenge'
  AND uc.status = 'active'
GROUP BY team_id
ORDER BY count DESC;

-- Sprawdź team_members
SELECT 
  tm.id,
  host.email as host_email,
  member.email as member_email,
  tm.challenge_status,
  tm.active_challenge_id,
  ac.title as challenge_title
FROM team_members tm
JOIN users host ON host.id = tm.user_id
JOIN users member ON member.id = tm.member_id
LEFT JOIN admin_challenges ac ON ac.id = tm.active_challenge_id
WHERE member.email = 'adamc4e@testapp.com'
  OR host.email = 'adamc4e@testapp.com'
ORDER BY tm.invited_to_challenge_at DESC;
