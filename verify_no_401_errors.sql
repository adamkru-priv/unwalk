-- Sprawdź czy wciąż pojawiają się błędy 401 dla process_push_outbox
-- (po wyłączeniu pg_cron powinny zniknąć)

-- To zapytanie możesz uruchomić w Supabase SQL Editor
-- lub sprawdzić w Edge Functions Logs

-- Szukaj logów z ostatnich 30 minut:
-- W Supabase Dashboard → Edge Functions → process_push_outbox → Logs
-- Filtruj po: status_code = 401 AND timestamp > now() - interval '30 minutes'

-- Jeśli nie ma nowych 401, to problem rozwiązany! ✅
