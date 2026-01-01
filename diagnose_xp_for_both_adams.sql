-- ========================================
-- 🔍 DIAGNOZA XP: adam.krusz vs adam@c4e.io
-- ========================================

-- 1. 📊 PODSUMOWANIE: Ile XP powinni mieć (z xp_transactions)
SELECT 
  u.email,
  u.display_name,
  COALESCE(SUM(xh.xp_amount), 0) as total_xp_from_history,
  COUNT(xh.id) as xp_entries_count
FROM users u
LEFT JOIN xp_transactions xh ON xh.user_id = u.id
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
GROUP BY u.id, u.email, u.display_name
ORDER BY u.email;

-- 2. 📜 HISTORIA XP: Wszystkie wpisy dla obu userów
SELECT 
  u.email,
  xh.xp_amount,
  xh.source_type,
  xh.description,
  xh.created_at,
  -- Jeśli source to challenge - pokaż szczegóły:
  CASE 
    WHEN xh.source_type = 'challenge' THEN ac.title
    ELSE NULL
  END as challenge_title,
  CASE 
    WHEN xh.source_type = 'challenge' THEN ac.points
    ELSE NULL
  END as challenge_points
FROM xp_transactions xh
JOIN users u ON xh.user_id = u.id
LEFT JOIN user_challenges uc ON xh.source_type = 'challenge' AND xh.source_id = uc.id::text
LEFT JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
ORDER BY u.email, xh.created_at DESC;

-- 3. 🎯 CLAIMED CHALLENGES: Które challenges dały XP?
SELECT 
  u.email,
  ac.title as challenge_name,
  ac.points as challenge_xp,
  uc.status,
  uc.claimed_at,
  uc.completed_at,
  -- Czy jest XP w historii?
  CASE 
    WHEN xh.id IS NULL THEN '❌ BRAK XP w historii'
    ELSE '✅ XP zapisane'
  END as xp_status,
  xh.xp_amount as actual_xp_given
FROM user_challenges uc
JOIN users u ON uc.user_id = u.id
JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
LEFT JOIN xp_transactions xh ON xh.source_type = 'challenge' AND xh.source_id = uc.id::text
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
  AND uc.status = 'claimed'
ORDER BY u.email, uc.claimed_at DESC;

-- 4. ⚠️ PROBLEMY: Claimed challenges BEZ XP w historii
SELECT 
  u.email,
  ac.title as challenge_name,
  ac.points as missing_xp,
  uc.claimed_at,
  uc.id as user_challenge_id
FROM user_challenges uc
JOIN users u ON uc.user_id = u.id
JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
LEFT JOIN xp_transactions xh ON xh.source_type = 'challenge' AND xh.source_id = uc.id::text
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
  AND uc.status = 'claimed'
  AND xh.id IS NULL  -- ❌ Brak w xp_transactions
ORDER BY u.email, uc.claimed_at DESC;

-- 5. 🔢 DUPLIKATY: Czy są challenges które dały XP 2 razy?
SELECT 
  u.email,
  xh.source_id,
  ac.title as challenge_name,
  COUNT(*) as duplicate_count,
  SUM(xh.xp_amount) as total_xp_from_duplicates,
  ARRAY_AGG(xh.created_at ORDER BY xh.created_at) as duplicate_dates
FROM xp_transactions xh
JOIN users u ON xh.user_id = u.id
LEFT JOIN user_challenges uc ON xh.source_type = 'challenge' AND xh.source_id = uc.id::text
LEFT JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
  AND xh.source_type = 'challenge'
GROUP BY u.email, xh.source_id, ac.title
HAVING COUNT(*) > 1;

-- 6. 📈 BREAKDOWN: XP z różnych źródeł
SELECT 
  u.email,
  xh.source_type,
  COUNT(*) as entries_count,
  SUM(xh.xp_amount) as total_xp
FROM xp_transactions xh
JOIN users u ON xh.user_id = u.id
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
GROUP BY u.email, xh.source_type
ORDER BY u.email, xh.source_type;

-- 7. 🎮 CO APLIKACJA POKAZUJE: Z funkcji gamification
-- (To wymaga wywołania funkcji w aplikacji - SQL nie ma dostępu do view 'user_gamification_stats')
SELECT 
  email,
  display_name,
  'Run getUserGamificationStats() in app to see actual XP shown to user' as note
FROM users
WHERE email IN ('adam.krusz@gmail.com', 'adam@c4e.io');

-- 8. 📊 PODSUMOWANIE KOŃCOWE
SELECT 
  u.email,
  COALESCE(SUM(xh.xp_amount), 0) as total_xp_should_have,
  COUNT(DISTINCT xh.id) as unique_xp_entries,
  COUNT(DISTINCT CASE WHEN uc.status = 'claimed' THEN uc.id END) as claimed_challenges_count,
  COUNT(DISTINCT CASE WHEN uc.status = 'claimed' AND xh.id IS NULL THEN uc.id END) as missing_xp_entries
FROM users u
LEFT JOIN xp_transactions xh ON xh.user_id = u.id
LEFT JOIN user_challenges uc ON uc.user_id = u.id
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
GROUP BY u.id, u.email
ORDER BY u.email;
