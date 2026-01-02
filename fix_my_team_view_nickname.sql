-- ============================================
-- FIX: Zaktualizuj widok my_team aby używał nickname
-- ============================================

-- Usuń stary widok
DROP VIEW IF EXISTS my_team;

-- Utwórz nowy widok z nickname
CREATE VIEW my_team AS
SELECT 
  tm.id,
  tm.member_id,
  tm.custom_name,
  tm.relationship,
  tm.notes,
  u.email,
  -- ✅ Use nickname if available, otherwise display_name
  COALESCE(NULLIF(u.nickname, ''), u.display_name, 'User ' || SUBSTRING(u.id::TEXT, 1, 8)) as display_name,
  u.avatar_url,
  u.tier,
  tm.added_at,
  -- Count their active challenges
  (SELECT COUNT(*) FROM user_challenges uc 
   WHERE uc.user_id = tm.member_id AND uc.status = 'active') as active_challenges_count
FROM team_members tm
JOIN public.users u ON tm.member_id = u.id
WHERE tm.user_id = auth.uid();

-- Test: sprawdź co zwraca widok
SELECT 'Test widoku my_team' as test;
SELECT id, member_id, display_name, email FROM my_team LIMIT 5;
