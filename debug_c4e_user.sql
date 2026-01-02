-- Sprawdź dokładnie dane użytkownika adam@c4e.io
SELECT 
  id,
  email,
  display_name,
  nickname,
  LENGTH(nickname) as nickname_length,
  LENGTH(display_name) as display_name_length,
  COALESCE(NULLIF(nickname, ''), display_name, 'User ' || SUBSTRING(id::TEXT, 1, 8)) as computed_name
FROM users
WHERE email = 'adam@c4e.io';

-- Sprawdź co zwraca widok my_team dla zalogowanego użytkownika
SELECT 
  tm.id,
  tm.member_id,
  tm.custom_name,
  u.email,
  u.display_name as raw_display_name,
  u.nickname as raw_nickname,
  COALESCE(NULLIF(u.nickname, ''), u.display_name, 'User ' || SUBSTRING(u.id::TEXT, 1, 8)) as computed_display_name
FROM team_members tm
JOIN users u ON tm.member_id = u.id
WHERE tm.user_id = (SELECT id FROM users WHERE email = 'adam@c4e.io')
ORDER BY tm.added_at;
