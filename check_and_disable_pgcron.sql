-- Sprawdź aktywne pg_cron joby
SELECT * FROM cron.job WHERE command LIKE '%process_push_outbox%';

-- Jeśli są, usuń je:
-- SELECT cron.unschedule('job_name_here');
