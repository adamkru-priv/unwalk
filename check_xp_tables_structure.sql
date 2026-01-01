-- Sprawdź które tabele XP istnieją
SELECT 
  table_name,
  string_agg(column_name || ' (' || data_type || ')', ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('xp_transactions', 'xp_history')
GROUP BY table_name;

-- Sprawdź ile danych jest w xp_transactions
SELECT 'xp_transactions' as table_name, COUNT(*) FROM xp_transactions;
