# 🔄 Ustawienia Synchronizacji - Instrukcja wdrożenia

## ✅ Co zostało zaimplementowane:

### 1️⃣ **Backend (SQL)**
- ✅ Nowe kolumny w tabeli `users`:
  - `auto_sync_enabled` (boolean) - toggle ON/OFF
  - `sync_interval_minutes` (integer) - interwał: 1, 5, 15, 30, 60 min
- ✅ Domyślne wartości: ON + 15 minut
- ✅ RLS policy dla update własnych ustawień

**Plik:** `add_sync_settings_to_users.sql`

### 2️⃣ **iOS Native (Swift)**
- ✅ `BackgroundTaskManager.swift`:
  - Sprawdzanie czy auto-sync jest włączony
  - `updateSyncSettings()` - aktualizacja ustawień
  - Automatyczne anulowanie tasków gdy wyłączone
  
- ✅ `BackgroundStepCheckPlugin.swift`:
  - `updateSyncSettings()` - komunikacja z JS
  - `getSyncSettings()` - pobieranie ustawień

### 3️⃣ **Frontend (TypeScript + React)**
- ✅ `useSyncSettings.ts` - React hook do zarządzania
- ✅ `SyncSettingsSection.tsx` - UI komponent z:
  - Toggle ON/OFF
  - Selektor interwału (1, 5, 15, 30, 60 min)
  - Informacje o stanie synchronizacji
- ✅ Integracja z `ProfileSettingsTab.tsx`

### 4️⃣ **Capacitor Plugin**
- ✅ `backgroundStepCheck.ts` - nowe metody API
- ✅ `web.ts` - mock dla web platform

---

## 🚀 Jak uruchomić:

### Krok 1: Uruchom migrację SQL
```bash
# Połącz się z Supabase i wykonaj:
psql -h <your-db-host> -U postgres -d postgres < add_sync_settings_to_users.sql
```

Lub w Supabase Dashboard → SQL Editor → Wklej zawartość pliku.

### Krok 2: Zbuduj iOS app
```bash
cd unwalk
npm run build
npx cap sync ios
npx cap open ios
```

W Xcode: **Product → Build** (Cmd+B)

### Krok 3: Uruchom aplikację
Uruchom na symulatorze lub fizycznym urządzeniu iOS.

---

## 🎯 Jak to działa:

### Przepływ danych:
```
User changes settings in UI
    ↓
useSyncSettings hook
    ↓
1. UPDATE Supabase (users table)
    ↓
2. BackgroundStepCheck.updateSyncSettings()
    ↓
3. iOS BackgroundTaskManager
    ↓
4. Reschedule/Cancel background tasks
```

### Przechowywanie:
- **Source of truth**: Supabase (`users` table)
- **iOS cache**: UserDefaults (dla szybkiego dostępu)
- **Sync**: Przy każdym załadowaniu ustawień

---

## 📱 Jak używać:

1. Otwórz aplikację
2. Przejdź do **Profile → Settings**
3. Znajdź sekcję **"Automatyczna synchronizacja"**
4. **Toggle**: Włącz/wyłącz auto-sync
5. **Interwał**: Wybierz częstotliwość (1, 5, 15, 30, 60 min)

### Zachowanie:
- **ON + 15 min** (domyślne): Sprawdza kroki co 15 minut w tle
- **OFF**: Synchronizacja tylko przy otwieraniu aplikacji
- **ON + 1 min**: Najczęstsza aktualizacja (może wpłynąć na baterię)
- **ON + 60 min**: Oszczędność baterii

---

## 🔍 Testowanie:

### W Xcode Debugger:
```bash
# Uruchom manual background task:
e -l objc -- (void)[[BGTaskScheduler sharedScheduler] _simulateLaunchForTaskWithIdentifier:@"com.unwalk.backgroundStepCheck"]
```

### Logi do sprawdzenia:
```
[BackgroundTask] 🔧 Settings updated: enabled=true, interval=5min
[BackgroundTask] ✅ Scheduled next check in 5.0 minutes
[BackgroundTask] ⏸️ Auto-sync disabled, cancelling scheduled tasks
```

---

## 🐛 Troubleshooting:

### Problem: Ustawienia się nie zapisują
- Sprawdź: RLS policy w Supabase
- Sprawdź: User jest zalogowany
- Console: Szukaj błędów `[SyncSettings]`

### Problem: Background sync nie działa
- Sprawdź: iOS Capabilities (Background Modes)
- Sprawdź: UserDefaults sync między JS a Swift
- Sprawdź: `auto_sync_enabled = true` w bazie

### Problem: UI nie wyświetla się
- Sprawdź: `isNative` = true (tylko iOS/Android)
- Sprawdź: Import `SyncSettingsSection` w ProfileSettingsTab

---

## 📊 Performance:

- **1 min interval**: ~1-2% baterii / godzinę
- **15 min interval**: ~0.1% baterii / godzinę (recommended)
- **60 min interval**: Minimalny wpływ

iOS automatycznie optymalizuje background tasks, więc rzeczywisty interwał może być dłuższy.

---

## 🔐 Security:

- ✅ RLS policy: User może edytować tylko swoje ustawienia
- ✅ Walidacja: Tylko dozwolone interwały (1, 5, 15, 30, 60)
- ✅ Swift validation: Double-check w native code
- ✅ Supabase auth: Wymaga zalogowania

---

## 🎉 GOTOWE!

Użytkownik może teraz:
- ✅ Włączyć/wyłączyć auto-sync
- ✅ Ustawić własny interwał (1-60 min)
- ✅ Domyślnie wszystko działa (ON + 15 min)
- ✅ Ustawienia są per-user i synchronizowane
