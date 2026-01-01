-- ⚠️⚠️⚠️ USUWA WSZYSTKICH UŻYTKOWNIKÓW! ⚠️⚠️⚠️

-- Usuń wszystkie dane użytkowników (tylko z tabel które ISTNIEJĄ)
DELETE FROM device_push_tokens;
DELETE FROM xp_transactions;
DELETE FROM challenge_stats;
DELETE FROM challenge_assignments;
DELETE FROM daily_quests;
DELETE FROM team_members;
DELETE FROM team_challenge_invitations;
DELETE FROM admin_challenges WHERE is_custom = true;
DELETE FROM daily_steps_rewards;
DELETE FROM users;
DELETE FROM auth.users;

-- Sprawdź czy wszystko puste
SELECT 
    'device_push_tokens' as table_name, 
    COUNT(*) as remaining 
FROM device_push_tokens
UNION ALL
SELECT 'xp_transactions', COUNT(*) FROM xp_transactions
UNION ALL
SELECT 'challenge_stats', COUNT(*) FROM challenge_stats
UNION ALL
SELECT 'challenge_assignments', COUNT(*) FROM challenge_assignments
UNION ALL
SELECT 'daily_quests', COUNT(*) FROM daily_quests
UNION ALL
SELECT 'team_members', COUNT(*) FROM team_members
UNION ALL
SELECT 'team_challenge_invitations', COUNT(*) FROM team_challenge_invitations
UNION ALL
SELECT 'daily_steps_rewards', COUNT(*) FROM daily_steps_rewards
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'auth.users', COUNT(*) FROM auth.users
ORDER BY table_name;
