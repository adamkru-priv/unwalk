-- ============================================
-- DIAGNOZA SYSTEMU NICKÓW
-- ============================================

-- 1. SPRAWDŹ CZY KOLUMNA NICKNAME ISTNIEJE
SELECT 'KROK 1: Kolumna nickname w tabeli users' as test_name;
SELECT 
  column_name, 
  data_type, 
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'nickname';

-- 2. SPRAWDŹ UŻYTKOWNIKÓW I ICH NICKI
SELECT 'KROK 2: Lista użytkowników z nickami' as test_name;
SELECT 
  id,
  email,
  display_name,
  nickname,
  is_guest,
  COALESCE(NULLIF(nickname, ''), display_name, 'User ' || SUBSTRING(id::TEXT, 1, 8)) as computed_display_name
FROM users
WHERE is_guest = false
ORDER BY created_at DESC
LIMIT 10;

-- 3. SPRAWDŹ CZY FUNKCJA get_campaign_leaderboard UŻYWA NICKNAME
SELECT 'KROK 3: Funkcja get_campaign_leaderboard - czy zawiera nickname?' as test_name;
SELECT 
  proname as function_name,
  CASE 
    WHEN prosrc LIKE '%nickname%' THEN 'TAK - używa nickname'
    ELSE 'NIE - brak nickname w kodzie'
  END as uses_nickname,
  LENGTH(prosrc) as code_length
FROM pg_proc 
WHERE proname = 'get_campaign_leaderboard';

-- 4. SPRAWDŹ WIDOK my_team
SELECT 'KROK 4: Widok my_team - czy używa nickname?' as test_name;
SELECT 
  viewname,
  CASE 
    WHEN definition LIKE '%nickname%' THEN 'TAK - używa nickname'
    ELSE 'NIE - brak nickname'
  END as uses_nickname
FROM pg_views
WHERE schemaname = 'public'
  AND viewname = 'my_team';

-- 5. SPRAWDŹ WIDOK my_sent_invitations
SELECT 'KROK 5: Widok my_sent_invitations - czy używa nickname?' as test_name;
SELECT 
  viewname,
  CASE 
    WHEN definition LIKE '%nickname%' THEN 'TAK - używa nickname'
    ELSE 'NIE - brak nickname'
  END as uses_nickname
FROM pg_views
WHERE schemaname = 'public'
  AND viewname = 'my_sent_invitations';

-- 6. SPRAWDŹ WIDOK my_received_invitations
SELECT 'KROK 6: Widok my_received_invitations - czy używa nickname?' as test_name;
SELECT 
  viewname,
  CASE 
    WHEN definition LIKE '%nickname%' THEN 'TAK - używa nickname'
    ELSE 'NIE - brak nickname'
  END as uses_nickname
FROM pg_views
WHERE schemaname = 'public'
  AND viewname = 'my_received_invitations';

-- 7. SYMULACJA: CO ZWRÓCI get_campaign_leaderboard
SELECT 'KROK 7: Test funkcji get_campaign_leaderboard (top 5)' as test_name;
SELECT * FROM get_campaign_leaderboard(5, 0);

-- 8. SYMULACJA: CO ZWRÓCI my_team
SELECT 'KROK 8: Test widoku my_team' as test_name;
SELECT 
  id,
  member_id,
  custom_name,
  email,
  display_name
FROM my_team
LIMIT 5;

-- 9. SPRAWDŹ TEAM_MEMBERS (surowe dane)
SELECT 'KROK 9: Surowe dane z team_members + users' as test_name;
SELECT 
  tm.id as team_member_id,
  tm.member_id,
  u.email,
  u.display_name,
  u.nickname,
  COALESCE(NULLIF(u.nickname, ''), u.display_name, 'User ' || SUBSTRING(u.id::TEXT, 1, 8)) as final_name
FROM team_members tm
JOIN users u ON tm.member_id = u.id
LIMIT 5;

-- 10. SPRAWDŹ CHALLENGE_ASSIGNMENTS (surowe dane)
SELECT 'KROK 10: Surowe dane z challenge_assignments + users (sender i recipient)' as test_name;
SELECT 
  ca.id as assignment_id,
  ca.sender_id,
  sender.email as sender_email,
  sender.display_name as sender_display_name,
  sender.nickname as sender_nickname,
  COALESCE(NULLIF(sender.nickname, ''), sender.display_name, 'Sender') as sender_final,
  ca.recipient_id,
  recipient.email as recipient_email,
  recipient.display_name as recipient_display_name,
  recipient.nickname as recipient_nickname,
  COALESCE(NULLIF(recipient.nickname, ''), recipient.display_name, 'Recipient') as recipient_final
FROM challenge_assignments ca
LEFT JOIN users sender ON ca.sender_id = sender.id
LEFT JOIN users recipient ON ca.recipient_id = recipient.id
LIMIT 5;

-- ============================================
-- PODSUMOWANIE
-- ============================================
SELECT 'PODSUMOWANIE' as test_name;
SELECT 
  'Kolumna nickname istnieje' as status,
  COUNT(*) as count
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'nickname'

UNION ALL

SELECT 
  'Użytkownicy z nickiem' as status,
  COUNT(*) as count
FROM users
WHERE nickname IS NOT NULL AND nickname != ''

UNION ALL

SELECT 
  'Funkcja get_campaign_leaderboard używa nickname' as status,
  COUNT(*) as count
FROM pg_proc 
WHERE proname = 'get_campaign_leaderboard'
  AND prosrc LIKE '%nickname%'

UNION ALL

SELECT 
  'Widok my_team używa nickname' as status,
  COUNT(*) as count
FROM pg_views
WHERE schemaname = 'public'
  AND viewname = 'my_team'
  AND definition LIKE '%nickname%';
