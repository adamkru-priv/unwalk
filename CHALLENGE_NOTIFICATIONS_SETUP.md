# 🔔 Automatyczne Powiadomienia o Wygasających Challenge'ach

## Jak to działa?

System automatycznie wysyła push powiadomienia gdy challenge wygasa (kończy się deadline).

### Przykład:
- User ustawia challenge na 6h
- System automatycznie zaplanuje powiadomienie za dokładnie 6h
- Po 6h user dostanie push: "Challenge Time is Up! ⏰"
- Powiadomienie otwiera aplikację i pokazuje wyniki

---

## 🚀 Instalacja (KROK PO KROKU)

### 1. Uruchom migrację bazy danych

Wykonaj w Supabase SQL Editor:

```bash
# Z terminala:
cd "/Users/adamkruszewski/Desktop/Projekty Priv/UnWalk"
cat create_scheduled_challenge_notifications.sql
```

Skopiuj zawartość i uruchom w Supabase Dashboard → SQL Editor.

**Co to robi:**
- Tworzy tabelę `scheduled_challenge_notifications` (przechowuje zaplanowane powiadomienia)
- Dodaje trigger który automatycznie planuje powiadomienie gdy user startuje challenge
- Tworzy funkcję `send_pending_challenge_notifications()` do wysyłania powiadomień

---

### 2. Deploy Edge Function

Edge Function sprawdza co minutę czy są powiadomienia do wysłania.

```bash
cd "/Users/adamkruszewski/Desktop/Projekty Priv/UnWalk/unwalk"

# Deploy Edge Function
npx supabase functions deploy send-challenge-notifications
```

---

### 3. Ustaw Cron Job (zewnętrzny)

Edge Function musi być wywoływana **co minutę**. Użyj jednej z opcji:

#### Opcja A: cron-job.org (ZALECANE - DARMOWE)

1. Idź na https://cron-job.org
2. Stwórz darmowe konto
3. Dodaj nowy Cron Job:
   - **URL**: `https://your-project.supabase.co/functions/v1/send-challenge-notifications`
   - **Schedule**: `*/1 * * * *` (co minutę)
   - **Headers**: 
     - `Authorization: Bearer YOUR_SUPABASE_ANON_KEY`
   - **Method**: POST

#### Opcja B: GitHub Actions (jeśli masz repo)

Stwórz `.github/workflows/challenge-notifications.yml`:

```yaml
name: Send Challenge Notifications
on:
  schedule:
    - cron: '*/1 * * * *'  # Co minutę
  workflow_dispatch:  # Możliwość ręcznego uruchomienia

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Send Notifications
        run: |
          curl -X POST \
            "https://your-project.supabase.co/functions/v1/send-challenge-notifications" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json"
```

#### Opcja C: Render.com Cron Jobs

1. W Render Dashboard dodaj nowy Cron Job
2. Command: `curl -X POST "https://your-project.supabase.co/functions/v1/send-challenge-notifications" -H "Authorization: Bearer YOUR_ANON_KEY"`
3. Schedule: `*/1 * * * *`

---

## ✅ Testowanie

### 1. Sprawdź zaplanowane powiadomienia

W Supabase SQL Editor:

```sql
SELECT * FROM check_scheduled_notifications();
```

### 2. Ręcznie wyślij powiadomienia (test)

```sql
SELECT * FROM send_pending_challenge_notifications();
```

### 3. Stwórz test challenge

W aplikacji:
1. Stwórz challenge z deadline 5 minut
2. Zacznij challenge
3. Sprawdź w bazie czy jest zaplanowane:
   ```sql
   SELECT * FROM scheduled_challenge_notifications 
   WHERE notification_sent = FALSE;
   ```
4. Poczekaj 5 minut
5. Powiadomienie powinno przyjść automatycznie!

---

## 🔍 Debugowanie

### Sprawdź logi Edge Function:

```bash
npx supabase functions logs send-challenge-notifications
```

### Sprawdź wysłane powiadomienia:

```sql
SELECT * FROM scheduled_challenge_notifications 
WHERE notification_sent = TRUE 
ORDER BY sent_at DESC LIMIT 10;
```

### Sprawdź push_outbox:

```sql
SELECT * FROM push_outbox 
WHERE type = 'challenge_expired' 
ORDER BY created_at DESC LIMIT 10;
```

---

## 📊 Monitoring

### Ile powiadomień wysłano dzisiaj?

```sql
SELECT COUNT(*) FROM scheduled_challenge_notifications
WHERE DATE(sent_at) = CURRENT_DATE;
```

### Wyczyść stare powiadomienia (>30 dni):

```sql
SELECT cleanup_old_notifications();
```

---

## 🎯 Jak działa automatyczne planowanie?

1. **User rozpoczyna challenge** → status zmienia się na 'active'
2. **Trigger** `trigger_schedule_challenge_expiry` wykrywa zmianę
3. **Funkcja** `schedule_challenge_expiry_notification()`:
   - Sprawdza czy challenge ma `time_limit_hours`
   - Jeśli TAK: dodaje rekord do `scheduled_challenge_notifications`
   - Wylicza dokładny czas: `started_at + time_limit_hours`
4. **Cron co minutę** wywołuje Edge Function
5. **Edge Function** wywołuje `send_pending_challenge_notifications()`
6. **Funkcja** sprawdza czy są powiadomienia do wysłania (scheduled_for <= NOW)
7. **Powiadomienia trafiają** do `push_outbox`
8. **Istniejący system push** wysyła je na urządzenia

---

## 🔧 Troubleshooting

### Powiadomienia nie przychodzą?

1. Sprawdź czy Edge Function jest wdrożona:
   ```bash
   npx supabase functions list
   ```

2. Sprawdź czy cron działa (cron-job.org → execution history)

3. Sprawdź logi:
   ```bash
   npx supabase functions logs send-challenge-notifications --tail
   ```

4. Ręcznie wyślij test:
   ```bash
   curl -X POST \
     "https://your-project.supabase.co/functions/v1/send-challenge-notifications" \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```

### Powiadomienia podwójne?

- Sprawdź czy nie masz wielu cronów działających jednocześnie
- W bazie jest `UNIQUE` constraint, więc nie powinno się to zdarzyć

---

## 📝 Notatki

- System wysyła powiadomienia z **5 minutowym marginesem** (jeśli scheduled_for <= NOW + 5min)
- Powiadomienia są wysyłane **tylko raz** (flaga `notification_sent`)
- Stare powiadomienia (>30 dni) można wyczyścić funkcją `cleanup_old_notifications()`
- System działa **bez pg_cron** (tylko zewnętrzny cron + Edge Function)

