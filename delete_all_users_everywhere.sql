-- ⚠️⚠️⚠️ UWAGA! ⚠️⚠️⚠️
-- Ten skrypt USUWA WSZYSTKICH UŻYTKOWNIKÓW ze WSZYSTKICH TABEL
-- To jest NIEODWRACALNE!
-- Backup bazy danych PRZED uruchomieniem!

-- 1. Wyłącz wszystkie triggery (żeby szybciej)
SET session_replication_role = 'replica';

-- 2. Usuń wszystkie tokeny push
DELETE FROM device_push_tokens;
RAISE NOTICE '✅ Deleted all push tokens';

-- 3. Usuń wszystkie transakcje XP
DELETE FROM xp_transactions;
RAISE NOTICE '✅ Deleted all XP transactions';

-- 4. Usuń całą historię XP
DELETE FROM xp_history;
RAISE NOTICE '✅ Deleted all XP history';

-- 5. Usuń wszystkie statystyki challengów
DELETE FROM challenge_stats;
RAISE NOTICE '✅ Deleted all challenge stats';

-- 6. Usuń wszystkie przypisania challengów
DELETE FROM challenge_assignments;
RAISE NOTICE '✅ Deleted all challenge assignments';

-- 7. Usuń wszystkie daily questy
DELETE FROM daily_quests;
RAISE NOTICE '✅ Deleted all daily quests';

-- 8. Usuń stare user challenges
DELETE FROM user_challenges;
RAISE NOTICE '✅ Deleted all user challenges';

-- 9. Usuń wszystkich członków teamów
DELETE FROM team_members;
RAISE NOTICE '✅ Deleted all team members';

-- 10. Usuń wszystkie zaproszenia do teamów
DELETE FROM team_challenge_invitations;
RAISE NOTICE '✅ Deleted all team invitations';

-- 11. Usuń wszystkie custom challenge'e
DELETE FROM admin_challenges WHERE is_custom = true;
RAISE NOTICE '✅ Deleted all custom challenges';

-- 12. Usuń daily steps rewards
DELETE FROM daily_steps_rewards;
RAISE NOTICE '✅ Deleted all daily steps rewards';

-- 13. Usuń wszystkie streaki
DELETE FROM streaks;
RAISE NOTICE '✅ Deleted all streaks';

-- 14. Usuń wszystkie profile użytkowników
DELETE FROM users;
RAISE NOTICE '✅ Deleted all user profiles';

-- 15. Usuń wszystkich użytkowników z Supabase Auth
DELETE FROM auth.users;
RAISE NOTICE '✅ Deleted all auth users';

-- 16. Włącz z powrotem triggery
SET session_replication_role = 'origin';

-- 17. Pokaż statystyki
SELECT 
    'device_push_tokens' as table_name, 
    COUNT(*) as remaining_rows 
FROM device_push_tokens
UNION ALL
SELECT 'xp_transactions', COUNT(*) FROM xp_transactions
UNION ALL
SELECT 'xp_history', COUNT(*) FROM xp_history
UNION ALL
SELECT 'challenge_stats', COUNT(*) FROM challenge_stats
UNION ALL
SELECT 'challenge_assignments', COUNT(*) FROM challenge_assignments
UNION ALL
SELECT 'daily_quests', COUNT(*) FROM daily_quests
UNION ALL
SELECT 'user_challenges', COUNT(*) FROM user_challenges
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
SELECT 'auth.users', COUNT(*) FROM auth.users;

RAISE NOTICE '🎉 ALL USERS DELETED FROM ALL TABLES!';
