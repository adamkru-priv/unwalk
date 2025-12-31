-- ============================================
-- Weryfikacja SENT Team Challenge Invitations
-- ============================================

-- 1. Sprawdź co jest w team_members (NOWY SYSTEM) - wysłane zaproszenia
SELECT 
  tm.id as invitation_id,
  tm.user_id as sender_id,
  tm.member_id as invited_user_id,
  tm.challenge_status,
  tm.active_challenge_id,
  tm.invited_to_challenge_at,
  sender.display_name as sender_name,
  invited.display_name as invited_name,
  ac.title as challenge_title,
  ac.goal_steps,
  ac.time_limit_hours
FROM team_members tm
LEFT JOIN users sender ON tm.user_id = sender.id
LEFT JOIN users invited ON tm.member_id = invited.id
LEFT JOIN admin_challenges ac ON tm.active_challenge_id = ac.id
WHERE tm.user_id = 'b9bfb86f-6447-4752-9c37-d6fdffb8b84b'  -- Twoje ID (adam.krusz)
  AND tm.challenge_status IN ('invited', 'accepted', 'rejected')
  AND tm.active_challenge_id IS NOT NULL
ORDER BY tm.invited_to_challenge_at DESC;

-- 2. Sprawdź co jest w STAREJ tabeli team_challenge_invitations (jeśli jeszcze istnieje)
SELECT 
  tci.id,
  tci.invited_by,
  tci.invited_user,
  tci.challenge_id,
  tci.status,
  tci.created_at,
  sender.display_name as sender_name,
  invited.display_name as invited_name,
  ac.title as challenge_title
FROM team_challenge_invitations tci
LEFT JOIN users sender ON tci.invited_by = sender.id
LEFT JOIN users invited ON tci.invited_user = invited.id
LEFT JOIN admin_challenges ac ON tci.challenge_id = ac.id
WHERE tci.invited_by = 'b9bfb86f-6447-4752-9c37-d6fdffb8b84b'
ORDER BY tci.created_at DESC;

-- 3. Sprawdź wszystkie zaproszenia (nowy system) dla twojego użytkownika
SELECT 
  tm.id,
  tm.challenge_status,
  tm.challenge_role,
  tm.active_challenge_id,
  tm.invited_to_challenge_at,
  member.display_name as member_name
FROM team_members tm
LEFT JOIN users member ON tm.member_id = member.id
WHERE tm.user_id = 'b9bfb86f-6447-4752-9c37-d6fdffb8b84b'
ORDER BY tm.invited_to_challenge_at DESC NULLS LAST;

-- 4. Porównaj: ile zaproszeń w nowym vs starym systemie
SELECT 
  'team_members (NEW)' as source,
  COUNT(*) as count
FROM team_members 
WHERE user_id = 'b9bfb86f-6447-4752-9c37-d6fdffb8b84b'
  AND challenge_status IN ('invited', 'accepted', 'rejected')
  AND active_challenge_id IS NOT NULL
UNION ALL
SELECT 
  'team_challenge_invitations (OLD)' as source,
  COUNT(*) as count
FROM team_challenge_invitations
WHERE invited_by = 'b9bfb86f-6447-4752-9c37-d6fdffb8b84b';

