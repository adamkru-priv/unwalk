# Sprawdź logi Edge Function

1. Wejdź na: https://supabase.com/dashboard/project/bctcjrxvgwooiayawfyl
2. Kliknij **Edge Functions** (lewa kolumna)
3. Kliknij na funkcję **process_push_outbox**
4. Zakładka **Logs**
5. Znajdź logi z czasu **22:40:38** (gdy wysłano notyfikację)

Szukaj linii z:
- "APNs send failed"
- "BadDeviceToken"
- "DeviceTokenNotForTopic"
- "Unregistered"

To powie nam DOKŁADNIE dlaczego notyfikacja nie dotarła!
