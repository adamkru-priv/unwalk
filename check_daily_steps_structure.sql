-- Sprawdź strukturę tabeli daily_steps
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'daily_steps'
ORDER BY ordinal_position;

-- Pokaż przykładowe dane
SELECT * FROM daily_steps
WHERE user_id = '72c48a7c-729e-4e43-9039-4ddc737fc0fa'
ORDER BY date DESC, updated_at DESC
LIMIT 5;
