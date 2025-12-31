-- ============================================
-- RESET ALL USER XP
-- Clears all XP for all users
-- ============================================

BEGIN;

-- 1. Reset all user XP fields to 0
UPDATE users 
SET 
  xp = 0,
  today_base_xp = 0
WHERE xp > 0 OR today_base_xp > 0;

-- 2. Verify the reset
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN xp > 0 THEN 1 END) as users_with_xp,
  SUM(xp) as sum_of_all_xp,
  MAX(xp) as max_xp,
  SUM(today_base_xp) as sum_of_today_xp
FROM users;

COMMIT;

-- Success message
SELECT '✅ All user XP has been reset to 0' as status;
