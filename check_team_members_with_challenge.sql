-- ============================================
-- Weryfikacja Team Members + Team Challenge
-- ============================================

-- 1. Sprawdź strukturę tabeli team_members (czy nowe kolumny istnieją)
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'team_members' 
ORDER BY ordinal_position;

-- 2. Sprawdź wszystkie rekordy w team_members z danymi użytkowników
SELECT 
  tm.id as team_member_id,
  tm.user_id as host_id,
  tm.member_id,
  tm.active_challenge_id,
  tm.challenge_role,
  tm.challenge_status,
  tm.invited_to_challenge_at,
  tm.created_at,
  host.email as host_email,
  host.display_name as host_name,
  member.email as member_email,
  member.display_name as member_name
FROM team_members tm
LEFT JOIN users host ON tm.user_id = host.id
LEFT JOIN users member ON tm.member_id = member.id
ORDER BY tm.created_at DESC
LIMIT 20;

-- 3. Sprawdź tylko zaproszenia do challenge (z challenge_status)
SELECT 
  tm.id,
  tm.user_id as host_id,
  tm.member_id,
  tm.challenge_status,
  tm.active_challenge_id,
  host.display_name as host_name,
  member.display_name as member_name,
  ac.title as challenge_title
FROM team_members tm
LEFT JOIN users host ON tm.user_id = host.id
LEFT JOIN users member ON tm.member_id = member.id
LEFT JOIN admin_challenges ac ON tm.active_challenge_id = ac.id
WHERE tm.active_challenge_id IS NOT NULL
ORDER BY tm.invited_to_challenge_at DESC;

-- 4. Sprawdź czy są jakiekolwiek users z NULL display_name
SELECT 
  id,
  email,
  display_name,
  created_at
FROM users
WHERE display_name IS NULL OR display_name = ''
ORDER BY created_at DESC;

-- 5. Sprawdź konkretnego użytkownika (zamień USER_ID na swoje ID)
-- SELECT 
--   tm.*,
--   member.email,
--   member.display_name
-- FROM team_members tm
-- LEFT JOIN users member ON tm.member_id = member.id
-- WHERE tm.user_id = 'YOUR_USER_ID_HERE';

-- 6. Sprawdź czy są aktywne team challenges
SELECT 
  uc.id as user_challenge_id,
  uc.user_id,
  uc.team_id,
  uc.admin_challenge_id,
  uc.current_steps,
  uc.status,
  u.display_name,
  ac.title as challenge_title,
  ac.goal_steps
FROM user_challenges uc
LEFT JOIN users u ON uc.user_id = u.id
LEFT JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
WHERE uc.team_id IS NOT NULL
AND uc.status = 'active'
ORDER BY uc.started_at DESC;

