-- Sprawdź wszystkie triggery związane z push notifications
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%push%' 
   OR trigger_name LIKE '%notif%'
   OR action_statement LIKE '%push_outbox%'
ORDER BY event_object_table, trigger_name;
