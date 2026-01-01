-- 1. Sprawdź strukturę tabeli xp_transactions
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'xp_transactions'
ORDER BY ordinal_position;

-- 2. Sprawdź ile jest rekordów PRZED testem
SELECT 'BEFORE TEST' as stage, COUNT(*) as count FROM xp_transactions;

-- 3. Pobierz ID użytkownika (Adam)
DO $$
DECLARE
  v_user_id UUID;
  v_result RECORD;
BEGIN
  -- Pobierz ID Adama
  SELECT id INTO v_user_id FROM users WHERE email LIKE '%adam%' LIMIT 1;
  
  RAISE NOTICE 'Testing with user_id: %', v_user_id;
  
  -- Wywołaj funkcję add_xp_to_user
  SELECT * INTO v_result 
  FROM add_xp_to_user(
    v_user_id, 
    10, 
    'test_manual', 
    'test_001', 
    'Manual test from SQL'
  );
  
  RAISE NOTICE 'Function returned: new_xp=%, new_level=%, leveled_up=%', 
    v_result.new_xp, v_result.new_level, v_result.leveled_up;
END $$;

-- 4. Sprawdź ile jest rekordów PO teście
SELECT 'AFTER TEST' as stage, COUNT(*) as count FROM xp_transactions;

-- 5. Pokaż ostatni rekord (jeśli został dodany)
SELECT * FROM xp_transactions ORDER BY created_at DESC LIMIT 1;
