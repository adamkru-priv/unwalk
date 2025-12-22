# Sprawdź szczegółowe logi Edge Function

Wejdź do Supabase Dashboard:
1. Edge Functions → process_push_outbox → Logs
2. Znajdź log z czasu 22:53:04 (status 200)
3. Rozwiń "Response body" lub "Execution logs"
4. Szukaj:
   - `"ok": false`
   - `"error": "Failed to load push_outbox"`
   - `"processed": 0`
   - `"results": []`

Jeśli widzisz któryś z tych błędów - to znaczy że request przeszedł, 
ale Edge Function nie mogła pobrać notyfikacji z push_outbox przez RLS.
