-- Sprawdź czy jest unique constraint na (user_id, date)
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints
WHERE table_name = 'daily_steps'
AND constraint_type = 'UNIQUE';

-- Sprawdź wszystkie constraints
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'daily_steps'
ORDER BY tc.constraint_type, kcu.ordinal_position;
