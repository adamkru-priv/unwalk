-- Sprawdź logi ostatnich wykonań pg_cron
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details 
WHERE jobid = 3
ORDER BY start_time DESC 
LIMIT 10;
