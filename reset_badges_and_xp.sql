-- ============================================
-- RESET: Clear all badges and XP for all users
-- ============================================

-- 1. Delete all user badges (unlocked achievements)
DELETE FROM user_badges;

-- 2. Reset all XP and level data in users table
UPDATE users
SET 
  xp = 0,
  level = 1,
  total_points = 0,
  current_streak = 0,
  longest_streak = 0,
  today_steps = 0,
  today_base_xp = 0,
  total_lifetime_steps = 0,
  last_activity_date = NULL,
  updated_at = NOW()
WHERE true;

-- 3. Delete all XP transaction history
DELETE FROM xp_transactions;

-- 4. Verify reset
SELECT 
  'user_badges' as table_name,
  COUNT(*) as remaining_records
FROM user_badges
UNION ALL
SELECT 
  'xp_transactions' as table_name,
  COUNT(*) as remaining_records
FROM xp_transactions
UNION ALL
SELECT 
  'users_with_xp_or_points' as table_name,
  COUNT(*) as remaining_records
FROM users
WHERE xp > 0 OR level > 1 OR total_points > 0;

-- 5. Show user status after reset
SELECT 
  email,
  display_name,
  nickname,
  xp,
  level,
  total_points,
  current_streak,
  longest_streak,
  today_steps,
  today_base_xp,
  total_lifetime_steps,
  (SELECT COUNT(*) FROM user_badges WHERE user_id = users.id) as badges_count
FROM users
WHERE is_guest = false
ORDER BY email;

COMMENT ON TABLE user_badges IS 'Reset: All badges cleared';
COMMENT ON TABLE xp_transactions IS 'Reset: All XP transactions cleared';
