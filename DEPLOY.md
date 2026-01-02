# 📱 DEPLOY - Instrukcja wdrożenia aplikacji UnWalk

> **Data utworzenia:** 2 stycznia 2026  
> **Wersja:** 3.0.1  
> **Autor:** Adam Kruszewski

---

## 🎯 WAŻNE - Przeczytaj przed deployem!

**NIE używaj flag `--config` z Capacitor CLI** - to powoduje błędy!  
**Zawsze buduj świeżą wersję** - nie polegaj na starych buildach w dist/

---

## 📋 Przygotowanie przed deployem

### 1. Sprawdź wersję aplikacji
```bash
cd /Users/adamkruszewski/Desktop/Projekty\ Priv/UnWalk/unwalk
cat package.json | grep version
```

### 2. Sprawdź czy wszystkie zmiany są commitowane
```bash
git status
```

### 3. Upewnij się, że masz zainstalowane zależności
```bash
npm install
```

---

## 🍎 DEPLOY NA iOS (TestFlight / App Store)

### Krok 1: Zbuduj aplikację webową
```bash
cd /Users/adamkruszewski/Desktop/Projekty\ Priv/UnWalk/unwalk
npm run build:ios:web
```

**Co to robi:**
- TypeScript compilation (`tsc -b`)
- Vite build z konfiguracją mobile (`vite.mobile.config.ts`)
- Tworzy zoptymalizowane pliki w `dist/`

**Oczekiwany output:**
```
✓ 604 modules transformed
dist/assets/spa-CebzA5TB.css   105.74 kB
dist/assets/spa-DnoHJhR_.js    838.85 kB
✓ built in ~2s
```

### Krok 2: Synchronizuj z iOS
```bash
npx cap sync ios
```

**⚠️ UWAGA:** NIE używaj `--config` flag!

**Co to robi:**
- Kopiuje web assets z `dist/` do `ios/App/App/public`
- Aktualizuje pluginy Capacitor (8 pluginów)
- Tworzy `capacitor.config.json` w iOS app

**Oczekiwany output:**
```
✔ Copying web assets from dist to ios/App/App/public in ~20ms
✔ Creating capacitor.config.json in ios/App/App in <1ms
✔ copy ios in ~46ms
✔ Updating iOS plugins in ~2ms
[info] Found 8 Capacitor plugins for ios:
       @capacitor/app@8.0.0
       @capacitor/haptics@8.0.0
       @capacitor/preferences@8.0.0
       @capacitor/push-notifications@8.0.0
       @capacitor/splash-screen@8.0.0
       @capacitor/status-bar@8.0.0
       @capacitor/toast@8.0.0
       capacitor-movee-healthkit@0.0.1
✔ Sync finished in ~0.4s
```

### Krok 3: Zastosuj patch iOS
```bash
npm run postcap:ios
```

**Co to robi:**
- Uruchamia `scripts/patch-ios-capacitor-config.mjs`
- Aktualizuje konfigurację push notifications (ApnsToken)

**Oczekiwany output:**
```
[patch-ios-capacitor-config] Updated packageClassList for ApnsToken (8 -> 9)
```

### Krok 4: Otwórz Xcode
```bash
npx cap open ios
```

**Oczekiwany output:**
```
✔ Opening the Xcode workspace... in ~3s
```

### Krok 5: W Xcode - Archive i Upload

1. **Wybierz target:** "Any iOS Device (arm64)"
2. **Product → Archive**
3. Poczekaj na build (~2-5 minut)
4. **Distribute App**
5. Wybierz **App Store Connect**
6. Wybierz **Upload**
7. Zatwierdź wszystkie opcje domyślne
8. Poczekaj na upload

### Krok 6: W App Store Connect

1. Otwórz https://appstoreconnect.apple.com
2. Wybierz aplikację **UnWalk**
3. Przejdź do **TestFlight**
4. Poczekaj na przetworzenie (~5-10 minut)
5. Dodaj do grupy testerów
6. Lub przejdź do **App Store** → nowa wersja

---

## 🤖 DEPLOY NA ANDROID (Google Play)

### Krok 1: Zbuduj aplikację webową
```bash
cd /Users/adamkruszewski/Desktop/Projekty\ Priv/UnWalk/unwalk
npm run build:android:web
```

**Co to robi:**
- TypeScript compilation (`tsc -b`)
- Vite build z konfiguracją mobile (`vite.mobile.config.ts`)
- Tworzy zoptymalizowane pliki w `dist/`

**Oczekiwany output:** (identyczny jak iOS)
```
✓ 604 modules transformed
dist/assets/spa-CebzA5TB.css   105.74 kB
dist/assets/spa-DnoHJhR_.js    838.85 kB
✓ built in ~2s
```

### Krok 2: Synchronizuj z Android
```bash
npx cap sync android
```

**⚠️ UWAGA:** NIE używaj `--config` flag!

**Co to robi:**
- Kopiuje web assets z `dist/` do `android/app/src/main/assets/public`
- Aktualizuje pluginy Capacitor (8 pluginów)
- Tworzy `capacitor.config.json` w Android app

**Oczekiwany output:**
```
✔ Copying web assets from dist to android/app/src/main/assets/public in ~14ms
✔ Creating capacitor.config.json in android/app/src/main/assets in <1ms
✔ copy android in ~26ms
✔ Updating Android plugins in ~2ms
[info] Found 8 Capacitor plugins for android:
       @capacitor/app@8.0.0
       @capacitor/haptics@8.0.0
       @capacitor/preferences@8.0.0
       @capacitor/push-notifications@8.0.0
       @capacitor/splash-screen@8.0.0
       @capacitor/status-bar@8.0.0
       @capacitor/toast@8.0.0
       capacitor-movee-healthkit@0.0.1
✔ Sync finished in ~0.26s
```

### Krok 3: Otwórz Android Studio
```bash
npx cap open android
```

**Oczekiwany output:**
```
[info] Opening Android project at: android.
```

### Krok 4: W Android Studio - Build Bundle/APK

1. **Poczekaj na Gradle sync** (może trwać 1-3 minuty przy pierwszym otwarciu)
2. **Build → Generate Signed Bundle / APK**
3. Wybierz **Android App Bundle** (dla Google Play)
4. **Next**
5. Wybierz keystore:
   - Key store path: `/path/to/your/keystore.jks`
   - Key store password: `[twoje hasło]`
   - Key alias: `unwalk` lub `movee`
   - Key password: `[twoje hasło]`
6. **Next**
7. Wybierz **release** build variant
8. Zaznacz **V1** i **V2** signatures
9. **Finish**
10. Poczekaj na build (~2-5 minut)

### Krok 5: Upload do Google Play Console

1. Znajdź wygenerowany AAB:
   - `android/app/release/app-release.aab`
2. Otwórz https://play.google.com/console
3. Wybierz aplikację **UnWalk**
4. **Release → Production** (lub Testing)
5. **Create new release**
6. Upload `app-release.aab`
7. Wypełnij release notes
8. **Review release**
9. **Start rollout to Production** (lub Testing)

---

## 🚀 SKRÓTY - Szybki deploy

### iOS - Jeden skrypt (automatyczny)
```bash
cd /Users/adamkruszewski/Desktop/Projekty\ Priv/UnWalk/unwalk
./build-testflight.sh
```

**Lub ręcznie (krok po kroku):**
```bash
cd /Users/adamkruszewski/Desktop/Projekty\ Priv/UnWalk/unwalk
npm run build:ios
npx cap open ios
# Potem w Xcode: Archive → Distribute
```

### Android - Jeden skrypt (automatyczny)
```bash
cd /Users/adamkruszewski/Desktop/Projekty\ Priv/UnWalk/unwalk
npm run build:android
npx cap open android
# Potem w Android Studio: Build → Generate Signed Bundle
```

---

## ⚠️ CZĘSTE PROBLEMY I ROZWIĄZANIA

### Problem: `unknown option '--config'`
**Przyczyna:** Capacitor CLI nie obsługuje flagi `--config`  
**Rozwiązanie:** Użyj `npx cap sync ios` zamiast `npx cap sync ios --config capacitor.config.ios.ts`

### Problem: Stara wersja aplikacji po zbudowaniu
**Przyczyna:** Nie zbudowano świeżej wersji web assets  
**Rozwiązanie:** Zawsze uruchom `npm run build:ios:web` lub `npm run build:android:web` PRZED `npx cap sync`

### Problem: Brak niektórych zmian w aplikacji
**Przyczyna:** Cache w `dist/` lub build artifacts  
**Rozwiązanie:**
```bash
rm -rf dist/
npm run build:ios:web  # lub build:android:web
npx cap sync ios       # lub android
```

### Problem: Xcode nie otwiera się
**Przyczyna:** Xcode nie jest zainstalowane lub nie jest ustawione jako domyślne  
**Rozwiązanie:**
```bash
sudo xcode-select -s /Applications/Xcode.app
npx cap open ios
```

### Problem: Android Studio nie otwiera się
**Przyczyna:** Android Studio nie jest w PATH  
**Rozwiązanie:** Otwórz ręcznie folder `android/` w Android Studio

---

## 📝 CHECKLIST PRZED DEPLOYEM

### Obowiązkowe
- [ ] Zmiany są commitowane do git
- [ ] Wersja w `package.json` jest zaktualizowana
- [ ] Aplikacja działa poprawnie w trybie dev
- [ ] Wszystkie testy przechodzą (jeśli są)

### iOS
- [ ] Certyfikaty są aktualne w Apple Developer Portal
- [ ] Provisioning profiles są pobrane w Xcode
- [ ] Build number jest wyższy niż poprzednia wersja

### Android
- [ ] Keystore jest dostępny
- [ ] Version code w `build.gradle` jest wyższy niż poprzednia wersja
- [ ] Release notes są przygotowane

---

## 🔢 WERSJONOWANIE

### Numer wersji (format: MAJOR.MINOR.PATCH)
- **MAJOR** - breaking changes, duże redesign
- **MINOR** - nowe funkcje, zgodne wstecz
- **PATCH** - bugfixy, małe poprawki

**Aktualna wersja:** 3.0.1

### Build number
- **iOS:** Automatycznie inkrementowany w Xcode
- **Android:** Ręcznie w `android/app/build.gradle` → `versionCode`

---

## 📊 MONITORING PO DEPLOYU

### iOS - TestFlight
1. Sprawdź crashe w Xcode Organizer
2. Sprawdź feedback od testerów
3. Monitoruj metryki w App Store Connect

### Android - Google Play Console
1. Sprawdź crashe w Play Console
2. Sprawdź ANR (Application Not Responding)
3. Monitoruj metryki instalacji i deinstalacji

---

## 🆘 POMOC

### Kontakt
- **Developer:** Adam Kruszewski
- **Projekt:** UnWalk (Movee)
- **Lokalizacja:** `/Users/adamkruszewski/Desktop/Projekty Priv/UnWalk`

### Przydatne linki
- **Apple Developer:** https://developer.apple.com
- **App Store Connect:** https://appstoreconnect.apple.com
- **Google Play Console:** https://play.google.com/console
- **Capacitor Docs:** https://capacitorjs.com/docs

---

## 📅 HISTORIA ZMIAN W PROCESIE DEPLOYU

### 2026-01-02
- ✅ Usunięto flagę `--config` z Capacitor CLI (powodowała błędy)
- ✅ Dodano krok `npm run postcap:ios` dla patch iOS
- ✅ Zaktualizowano dokumentację z aktualnymi wersjami pluginów (Capacitor 8.0.0)
- ✅ Dodano ostrzeżenia o budowaniu świeżej wersji

---

**🎯 PAMIĘTAJ:** Zawsze buduj świeżą wersję przed deployem. Nie polegaj na starych buildach!
