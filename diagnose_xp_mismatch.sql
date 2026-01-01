-- ========================================
-- 🔍 DIAGNOZA: Dlaczego adam.krusz ma 0 XP?
-- ========================================

-- 1. Sprawdź aktualny XP obu userów (z xp_transactions)
SELECT 
  u.id,
  u.email,
  u.display_name,
  u.xp as current_xp,
  u.level,
  COALESCE(SUM(xh.xp_amount), 0) as total_from_transactions,
  COUNT(xh.id) as transaction_count
FROM users u
LEFT JOIN xp_transactions xh ON xh.user_id = u.id
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
GROUP BY u.id, u.email, u.display_name, u.xp, u.level;

-- 2. Pokaż WSZYSTKIE wpisy XP dla obu userów
SELECT 
  u.email,
  xh.id as transaction_id,
  xh.xp_amount,
  xh.source_type,
  xh.source_id,
  xh.description,
  xh.created_at
FROM xp_transactions xh
JOIN users u ON xh.user_id = u.id
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
ORDER BY u.email, xh.created_at DESC;

-- 3. Sprawdź challenges obu userów
SELECT 
  u.email,
  uc.id as challenge_id,
  ac.title,
  ac.points,
  uc.status,
  uc.completed_at,
  uc.claimed_at,
  COALESCE(SUM(xh.xp_amount), 0) as xp_from_history
FROM user_challenges uc
JOIN users u ON uc.user_id = u.id
JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
LEFT JOIN xp_transactions xh ON xh.user_id = u.id
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
GROUP BY u.email, uc.id, ac.title, ac.points, uc.status, uc.completed_at, uc.claimed_at
ORDER BY u.email, uc.claimed_at DESC NULLS LAST;

-- 4. Breakdown XP według typu dla obu userów
SELECT 
  u.email,
  xh.source_type,
  COUNT(*) as count,
  SUM(xh.xp_amount) as total_xp
FROM xp_transactions xh
JOIN users u ON xh.user_id = u.id
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
GROUP BY u.email, xh.source_type
ORDER BY u.email, xh.source_type;

-- 5. Sprawdź gamification stats (może tam jest problem?)
SELECT 
  u.email,
  u.xp,
  u.level,
  u.total_points,
  u.current_streak,
  u.longest_streak
FROM users u
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io');

-- 6. Szczegółowe info o KAŻDYM claimed challenge
SELECT 
  u.email,
  ac.title,
  ac.points,
  uc.status,
  uc.claimed_at,
  -- Czy jest w xp_transactions?
  CASE WHEN xh.id IS NULL THEN '❌ BRAK w xp_transactions' ELSE '✅ Jest w xp_transactions' END as in_history,
  xh.xp_amount as xp_recorded,
  xh.created_at as xp_recorded_at
FROM user_challenges uc
JOIN users u ON uc.user_id = u.id
JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
LEFT JOIN xp_transactions xh ON xh.source_type = 'challenge' AND xh.source_id = uc.id::text
WHERE u.email IN ('adam.krusz@gmail.com', 'adam@c4e.io')
  AND uc.status = 'claimed'
ORDER BY u.email, uc.claimed_at DESC;

-- 7. Sprawdź czy są duplikaty w xp_transactions
SELECT 
  source_id,
  COUNT(*) as duplicate_count
FROM xp_transactions
WHERE source_type = 'challenge'
GROUP BY source_id
HAVING COUNT(*) > 1;
