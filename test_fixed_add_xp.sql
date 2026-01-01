-- Test naprawionej funkcji add_xp_to_user
DO $$
DECLARE
    v_user_id uuid;
    v_result record;
BEGIN
    -- Pobierz ID użytkownika
    SELECT id INTO v_user_id FROM users WHERE email = 'adam.krusz@gmail.com';
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    RAISE NOTICE 'Testing add_xp_to_user for user: %', v_user_id;
    
    -- Test z text source_id (nie-UUID) - powinno zadziałać
    SELECT * INTO v_result FROM add_xp_to_user(
        v_user_id,
        10,
        'test_manual',
        'test_001',  -- ✅ Text, nie UUID
        'Manual test - text source_id'
    );
    
    RAISE NOTICE '✅ Test 1 (text source_id): XP: %, Level: %, Leveled up: %', 
        v_result.new_total_xp, 
        v_result.new_level, 
        v_result.leveled_up;
    
    -- Test z UUID source_id - też powinno zadziałać
    SELECT * INTO v_result FROM add_xp_to_user(
        v_user_id,
        15,
        'test_manual',
        v_user_id::text,  -- ✅ UUID jako text
        'Manual test - UUID source_id'
    );
    
    RAISE NOTICE '✅ Test 2 (UUID source_id): XP: %, Level: %, Leveled up: %', 
        v_result.new_total_xp, 
        v_result.new_level, 
        v_result.leveled_up;
        
    RAISE NOTICE '🎉 All tests passed!';
END $$;

-- Pokaż ostatnie transakcje XP
SELECT 
    created_at,
    xp_amount,
    source_type,
    source_id,
    description
FROM xp_transactions
WHERE user_id = (SELECT id FROM users WHERE email = 'adam.krusz@gmail.com')
ORDER BY created_at DESC
LIMIT 5;
