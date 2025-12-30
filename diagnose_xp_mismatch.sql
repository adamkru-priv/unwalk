-- ========================================
-- 🔍 DIAGNOZA: Niezgodność punktów XP
-- ========================================

-- 1. Sprawdź aktualny XP obu userów (z xp_history)
SELECT 
  u.id,
  u.email,
  u.display_name,
  COALESCE(SUM(xh.amount), 0) as total_xp_from_history,
  u.created_at
FROM users u
LEFT JOIN xp_history xh ON xh.user_id = u.id
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
GROUP BY u.id, u.email, u.display_name, u.created_at
ORDER BY u.email;

-- 2. Sprawdź historię XP dla adam.krusz@gmail.com
SELECT 
  xh.id,
  xh.user_id,
  xh.amount,
  xh.source_type,
  xh.source_id,
  xh.description,
  xh.created_at,
  -- Jeśli source to challenge:
  uc.status as challenge_status,
  ac.title as challenge_title,
  ac.points as challenge_points
FROM xp_history xh
LEFT JOIN user_challenges uc ON xh.source_type = 'challenge' AND xh.source_id = uc.id::text
LEFT JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
WHERE xh.user_id = (SELECT id FROM users WHERE email = 'adam.krusz@gmail.com')
ORDER BY xh.created_at DESC;

-- 3. Policz sumę XP z historii dla adam.krusz@gmail.com
SELECT 
  u.email,
  u.display_name,
  COALESCE(SUM(xh.amount), 0) as total_xp_from_history,
  COUNT(xh.id) as xp_entries_count
FROM users u
LEFT JOIN xp_history xh ON xh.user_id = u.id
WHERE u.email = 'adam.krusz@gmail.com'
GROUP BY u.email, u.display_name;

-- 4. Sprawdź historię XP dla adam@c4e.io
SELECT 
  xh.id,
  xh.user_id,
  xh.amount,
  xh.source_type,
  xh.source_id,
  xh.description,
  xh.created_at,
  -- Jeśli source to challenge:
  uc.status as challenge_status,
  ac.title as challenge_title,
  ac.points as challenge_points
FROM xp_history xh
LEFT JOIN user_challenges uc ON xh.source_type = 'challenge' AND xh.source_id = uc.id::text
LEFT JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
WHERE xh.user_id = (SELECT id FROM users WHERE email = 'adam@c4e.io')
ORDER BY xh.created_at DESC;

-- 5. Policz sumę XP z historii dla adam@c4e.io
SELECT 
  u.email,
  u.display_name,
  COALESCE(SUM(xh.amount), 0) as total_xp_from_history,
  COUNT(xh.id) as xp_entries_count
FROM users u
LEFT JOIN xp_history xh ON xh.user_id = u.id
WHERE u.email = 'adam@c4e.io'
GROUP BY u.email, u.display_name;

-- 6. Sprawdź czy są challenges które dały XP ale nie ma ich w historii
SELECT 
  uc.id,
  uc.user_id,
  u.email,
  uc.status,
  ac.title,
  ac.points,
  uc.claimed_at,
  uc.completed_at,
  -- Czy jest w xp_history?
  CASE WHEN xh.id IS NULL THEN '❌ BRAK w xp_history' ELSE '✅ Jest w xp_history' END as in_history
FROM user_challenges uc
JOIN users u ON uc.user_id = u.id
JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
LEFT JOIN xp_history xh ON xh.source_type = 'challenge' AND xh.source_id = uc.id::text
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
  AND uc.status = 'claimed'
ORDER BY uc.claimed_at DESC;

-- 7. Sprawdź czy są duplikaty w xp_history
SELECT 
  source_type,
  source_id,
  user_id,
  u.email,
  COUNT(*) as count,
  SUM(amount) as total_xp_from_duplicates
FROM xp_history xh
JOIN users u ON xh.user_id = u.id
WHERE xh.user_id IN (
  SELECT id FROM users WHERE email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
)
GROUP BY source_type, source_id, user_id, u.email
HAVING COUNT(*) > 1;

-- 8. Sprawdź czy user_challenges bez claimed_at mają XP w historii (BUG!)
SELECT 
  uc.id,
  u.email,
  uc.status,
  ac.title,
  ac.points,
  uc.claimed_at,
  xh.id as xp_history_id,
  xh.amount as xp_amount
FROM user_challenges uc
JOIN users u ON uc.user_id = u.id
JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
LEFT JOIN xp_history xh ON xh.source_type = 'challenge' AND xh.source_id = uc.id::text
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
  AND uc.status = 'claimed'
  AND uc.claimed_at IS NULL  -- ❌ BUG: claimed ale bez claimed_at
ORDER BY uc.created_at DESC;

-- 9. Porównaj XP z xp_history vs co pokazuje aplikacja (z gamification view)
SELECT 
  u.email,
  u.display_name,
  COALESCE(SUM(xh.amount), 0) as xp_from_history,
  -- Jeśli masz view/funkcję do gamification:
  (SELECT total_xp FROM user_gamification_stats WHERE user_id = u.id) as xp_from_view
FROM users u
LEFT JOIN xp_history xh ON xh.user_id = u.id
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
GROUP BY u.id, u.email, u.display_name;
