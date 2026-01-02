-- Reset all XP for adam.krusz@gmail.com

-- 1. Find user ID
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get user ID
    SELECT id INTO v_user_id
    FROM users
    WHERE email = 'adam.krusz@gmail.com';
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User not found: adam.krusz@gmail.com';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found user: % (ID: %)', 'adam.krusz@gmail.com', v_user_id;
    
    -- 2. Delete all XP transactions
    DELETE FROM user_xp_transactions
    WHERE user_id = v_user_id;
    RAISE NOTICE 'Deleted XP transactions';
    
    -- 3. Delete all daily XP records
    DELETE FROM user_daily_xp
    WHERE user_id = v_user_id;
    RAISE NOTICE 'Deleted daily XP records';
    
    -- 4. Reset user XP and level to starting values
    UPDATE users
    SET 
        xp = 0,
        level = 1,
        updated_at = NOW()
    WHERE id = v_user_id;
    RAISE NOTICE 'Reset user XP to 0 and level to 1';
    
    -- 5. Show final state
    RAISE NOTICE '=== Final State ===';
    RAISE NOTICE 'User: adam.krusz@gmail.com';
    RAISE NOTICE 'XP: 0';
    RAISE NOTICE 'Level: 1';
    RAISE NOTICE 'XP Transactions: 0';
    RAISE NOTICE 'Daily XP Records: 0';
    
END $$;

-- Verify the reset
SELECT 
    email,
    xp,
    level,
    (SELECT COUNT(*) FROM user_xp_transactions WHERE user_id = users.id) as xp_transactions,
    (SELECT COUNT(*) FROM user_daily_xp WHERE user_id = users.id) as daily_xp_records
FROM users
WHERE email = 'adam.krusz@gmail.com';
