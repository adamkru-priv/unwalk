-- ⚠️⚠️⚠️ UWAGA! ⚠️⚠️⚠️
-- Ten skrypt USUWA WSZYSTKICH UŻYTKOWNIKÓW ze WSZYSTKICH TABEL
-- To jest NIEODWRACALNE!

-- 1. Usuń wszystkie tokeny push
DELETE FROM device_push_tokens;

-- 2. Usuń wszystkie transakcje XP
DELETE FROM xp_transactions;

-- 3. Usuń wszystkie statystyki challengów
DELETE FROM challenge_stats;

-- 4. Usuń wszystkie przypisania challengów
DELETE FROM challenge_assignments;

-- 5. Usuń wszystkie daily questy
DELETE FROM daily_quests;

-- 6. Usuń stare user challenges (jeśli istnieje)
DELETE FROM user_challenges;

-- 7. Usuń wszystkich członków teamów
DELETE FROM team_members;

-- 8. Usuń wszystkie zaproszenia do teamów
DELETE FROM team_challenge_invitations;

-- 9. Usuń wszystkie custom challenge'e
DELETE FROM admin_challenges WHERE is_custom = true;

-- 10. Usuń daily steps rewards
DELETE FROM daily_steps_rewards;

-- 11. Usuń wszystkie streaki
DELETE FROM streaks;

-- 12. Usuń wszystkie profile użytkowników
DELETE FROM users;

-- 13. Usuń wszystkich użytkowników z Supabase Auth
DELETE FROM auth.users;

-- 14. Pokaż statystyki (ile zostało)
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
SELECT 'streaks', COUNT(*) FROM streaks
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'auth.users', COUNT(*) FROM auth.users
ORDER BY table_name;
