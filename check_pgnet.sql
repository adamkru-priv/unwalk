-- Sprawdź czy pg_net jest dostępny
SELECT * FROM pg_available_extensions WHERE name = 'pg_net';

-- Sprawdź zainstalowane extensions
SELECT extname, extversion FROM pg_extension WHERE extname IN ('pg_net', 'http', 'pg_cron');

-- Sprawdź funkcje HTTP
SELECT proname, pronargs 
FROM pg_proc 
WHERE proname LIKE '%http%' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'extensions')
ORDER BY proname;
