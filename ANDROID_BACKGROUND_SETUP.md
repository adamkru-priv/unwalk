# Android Background Task Configuration

## Required Changes

### 1. Dodaj WorkManager dependency

W `android/app/build.gradle` dodaj:

```gradle
dependencies {
    // ...existing dependencies...
    
    // WorkManager for background tasks
    implementation "androidx.work:work-runtime-ktx:2.8.1"
}
```

### 2. AndroidManifest.xml

Upewnij się, że masz uprawnienie do powiadomień (już dodane):

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```

### 3. Pliki Kotlin

Wszystkie pliki zostały już dodane do projektu:
- ✅ `BackgroundStepCheckWorker.kt` - WorkManager worker
- ✅ `BackgroundStepCheckPlugin.kt` - Capacitor plugin
- ✅ `NotificationHelper.kt` - Helper do powiadomień
- ✅ `MainActivity.java` - Zainicjalizowany plugin i WorkManager

### 4. Jak działa na Androidzie

**WorkManager** automatycznie:
- Zarządza harmonogramem zadań
- Respektuje tryb oszczędzania baterii
- Przeżywa restarty systemu
- Dostosowuje się do warunków urządzenia

**Częstotliwość sprawdzania:**
- Minimum: **15 minut** (ograniczenie Android)
- Dla krótszych interwałów (5/10 min): Android i tak będzie czekał ~15 min
- Flex interval: ±5 minut (system decyduje dokładnie kiedy uruchomić)

### 5. Build i testowanie

```bash
# Sync Android
cd unwalk
npm run build
npx cap sync android
npx cap open android
```

W Android Studio:
1. Build → Clean Project
2. Build → Rebuild Project
3. Run na urządzeniu/emulatorze

### 6. Testowanie background tasks

**Natychmiastowe testowanie:**
```bash
adb shell cmd jobscheduler run -f com.adamkruszewski.movee 1
```

**Sprawdzanie logów:**
```bash
adb logcat | grep BackgroundStepCheck
```

### 7. Różnice iOS vs Android

| Feature | iOS | Android |
|---------|-----|---------|
| **API** | BGTaskScheduler | WorkManager |
| **Min. interval** | 15 min | 15 min |
| **Precision** | ±30% | ±5 min (flex) |
| **Battery mode** | Disabled in Low Power | Respects Doze mode |
| **Reliability** | System decides | More predictable |
| **Setup** | Complex | Simple |

### 8. Uprawnienia

Na Android 13+ użytkownik musi zaakceptować uprawnienie do powiadomień:
- Popup pojawi się automatycznie przy pierwszym uruchomieniu
- Można też zarządzać w Settings → Notifications

### 9. Debugging

**Wymuś natychmiastowe uruchomienie:**
```kotlin
// W Android Studio Logcat lub przez adb
adb shell am broadcast -a android.intent.action.BOOT_COMPLETED
```

**Sprawdź zaplanowane zadania:**
```bash
adb shell dumpsys jobscheduler | grep movee
```

## Troubleshooting

### Background task się nie uruchamia?

1. **Sprawdź Battery Optimization:**
   - Settings → Apps → Movee → Battery → Unrestricted

2. **Sprawdź czy WorkManager jest zainicjowany:**
   ```bash
   adb logcat | grep WorkManager
   ```

3. **Wymuś uruchomienie:**
   ```kotlin
   BackgroundStepCheckWorker.scheduleWork(context, 15L)
   ```

4. **Sprawdź uprawnienia:**
   - Notifications permission granted?
   - Health Connect permission granted?

## Notes

- Android WorkManager jest **bardziej niezawodny** niż iOS BGTaskScheduler
- Zadania przeżywają restarty systemu automatycznie
- System sam optymalizuje częstotliwość w zależności od wzorców użycia
- W trybie Doze może być opóźnienie do 15+ minut
