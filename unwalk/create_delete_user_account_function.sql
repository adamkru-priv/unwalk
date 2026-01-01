-- Funkcja do usuwania konta użytkownika i wszystkich powiązanych danych
CREATE OR REPLACE FUNCTION delete_user_account(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Sprawdź czy użytkownik istnieje
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Sprawdź czy wywołujący to właściciel konta (RLS)
    IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Not authenticated or not authorized';
    END IF;
    
    RAISE NOTICE 'Starting account deletion for user: %', p_user_id;
    
    -- 1. Usuń tokeny push
    DELETE FROM device_push_tokens WHERE user_id = p_user_id;
    RAISE NOTICE '✅ Deleted push tokens';
    
    -- 2. Usuń transakcje XP
    DELETE FROM xp_transactions WHERE user_id = p_user_id;
    RAISE NOTICE '✅ Deleted XP transactions';
    
    -- 3. Usuń historię XP
    DELETE FROM xp_history WHERE user_id = p_user_id;
    RAISE NOTICE '✅ Deleted XP history';
    
    -- 4. Usuń statystyki challengów
    DELETE FROM challenge_stats WHERE user_id = p_user_id;
    RAISE NOTICE '✅ Deleted challenge stats';
    
    -- 5. Usuń przypisania challengów
    DELETE FROM challenge_assignments WHERE user_id = p_user_id;
    RAISE NOTICE '✅ Deleted challenge assignments';
    
    -- 6. Usuń daily questy
    DELETE FROM daily_quests WHERE user_id = p_user_id;
    RAISE NOTICE '✅ Deleted daily quests';
    
    -- 7. Usuń user_challenges (stare)
    DELETE FROM user_challenges WHERE user_id = p_user_id;
    RAISE NOTICE '✅ Deleted user challenges';
    
    -- 8. Usuń członkostwo w teamach
    DELETE FROM team_members WHERE user_id = p_user_id;
    RAISE NOTICE '✅ Deleted team memberships';
    
    -- 9. Usuń zaproszenia do teamów (jako zapraszający)
    DELETE FROM team_challenge_invitations WHERE invited_by = p_user_id;
    RAISE NOTICE '✅ Deleted sent team invitations';
    
    -- 10. Usuń zaproszenia do teamów (jako zaproszony)
    DELETE FROM team_challenge_invitations WHERE invited_user_id = p_user_id;
    RAISE NOTICE '✅ Deleted received team invitations';
    
    -- 11. Usuń custom challenge'e stworzone przez użytkownika
    DELETE FROM admin_challenges 
    WHERE created_by_user_id = p_user_id 
      AND is_custom = true;
    RAISE NOTICE '✅ Deleted custom challenges';
    
    -- 12. Usuń daily steps rewards
    DELETE FROM daily_steps_rewards WHERE user_id = p_user_id;
    RAISE NOTICE '✅ Deleted daily steps rewards';
    
    -- 13. Usuń streak data
    DELETE FROM streaks WHERE user_id = p_user_id;
    RAISE NOTICE '✅ Deleted streak data';
    
    -- 14. Na końcu usuń profil użytkownika
    DELETE FROM users WHERE id = p_user_id;
    RAISE NOTICE '✅ Deleted user profile';
    
    -- 15. Usuń użytkownika z Supabase Auth (to musi być ostatnie)
    -- To wymaga uprawnień SECURITY DEFINER
    DELETE FROM auth.users WHERE id = p_user_id;
    RAISE NOTICE '✅ Deleted auth user';
    
    RAISE NOTICE '�� Account deletion completed successfully';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_user_account(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_account(uuid) TO service_role;

COMMENT ON FUNCTION delete_user_account IS 'Permanently deletes user account and all associated data. Can only be called by the account owner.';
