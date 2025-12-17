# 📱 MOVEE - Przewodnik Implementacji Capacitor dla iOS

## 🎯 Cel
Przekształcenie obecnej aplikacji PWA w natywną aplikację iOS używając **Capacitor** - frameworka pozwalającego uruchomić aplikację webową jako native app z dostępem do API urządzenia.

---

## 📋 Spis Treści
1. [Przygotowanie Środowiska](#1-przygotowanie-środowiska)
2. [Instalacja Capacitor](#2-instalacja-capacitor)
3. [Konfiguracja Projektu](#3-konfiguracja-projektu)
4. [Integracja z HealthKit](#4-integracja-z-healthkit)
5. [Build i Testowanie](#5-build-i-testowanie)
6. [Publikacja w App Store](#6-publikacja-w-app-store)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Przygotowanie Środowiska

### Wymagania Systemowe
✅ macOS (wymagane dla iOS development)  
✅ Xcode 14+ (zainstaluj z App Store)  
✅ Node.js 18+ (już masz)  
✅ npm/pnpm (już masz)  
✅ CocoaPods (dla iOS dependencies)

### Instalacja Xcode Command Line Tools
```bash
xcode-select --install
```

### Instalacja CocoaPods
```bash
sudo gem install cocoapods
pod --version  # Sprawdź instalację
```

### Apple Developer Account
- **Darmowy:** Można testować na własnym urządzeniu
- **Płatny ($99/rok):** Wymagany do publikacji w App Store

---

## 2. Instalacja Capacitor

### Krok 2.1: Instalacja Core Packages
```bash
cd unwalk

# Instaluj Capacitor
npm install @capacitor/core @capacitor/cli

# Inicjalizuj Capacitor
npx cap init
```

**Podczas `cap init` podaj:**
- **App name:** MOVEE
- **App Package ID:** `com.movee.app` (lub `com.yourcompany.movee`)
- **Web asset directory:** `dist`

### Krok 2.2: Dodaj Platformę iOS
```bash
# Dodaj iOS platform
npm install @capacitor/ios
npx cap add ios
```

To utworzy folder `ios/` w głównym katalogu projektu.

### Krok 2.3: Zainstaluj Essential Plugins
```bash
# Status bar (kontrola paska statusu)
npm install @capacitor/status-bar

# Splash screen (ekran ładowania)
npm install @capacitor/splash-screen

# App (lifecycle events, deep links)
npm install @capacitor/app

# Haptics (wibracje)
npm install @capacitor/haptics

# Toast (native toasts)
npm install @capacitor/toast
```

---

## 3. Konfiguracja Projektu

### Krok 3.1: Aktualizacja `capacitor.config.ts`
```typescript
// unwalk/capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.movee.app',
  appName: 'MOVEE',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#8B5CF6', // purple-600
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'dark', // dark content dla light bg
      backgroundColor: '#8B5CF6',
    },
  },
};

export default config;
```

### Krok 3.2: Aktualizacja Build Script w `package.json`
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "build:ios": "npm run build && npx cap sync ios",
    "open:ios": "npx cap open ios",
    "lint": "eslint .",
    "preview": "vite preview"
  }
}
```

### Krok 3.3: Build i Synchronizacja
```bash
# Build projektu
npm run build

# Skopiuj build do native projektu
npx cap sync ios
```

**Co robi `cap sync`?**
- Kopiuje zawartość `dist/` do iOS projektu
- Instaluje native dependencies (CocoaPods)
- Aktualizuje konfigurację

---

## 4. Integracja z HealthKit

### Krok 4.1: Instalacja Plugin HealthKit
```bash
npm install @perfood/capacitor-healthkit
npx cap sync ios
```

### Krok 4.2: Konfiguracja Uprawnień w `Info.plist`

Otwórz projekt w Xcode:
```bash
npx cap open ios
```

W Xcode:
1. Wybierz projekt **App** w lewym panelu
2. Wybierz target **App**
3. Zakładka **Info**
4. Dodaj następujące keys:

```xml
<key>NSHealthShareUsageDescription</key>
<string>MOVEE needs access to your step count to track your challenge progress and unlock your rewards.</string>

<key>NSHealthUpdateUsageDescription</key>
<string>MOVEE needs to write workout data to Apple Health.</string>
```

### Krok 4.3: Włączenie HealthKit Capability

W Xcode:
1. Wybierz target **App**
2. Zakładka **Signing & Capabilities**
3. Kliknij **+ Capability**
4. Wybierz **HealthKit**
5. Zaznacz opcje:
   - ✅ Clinical Health Records
   - ✅ Background Delivery (dla synchronizacji w tle)

### Krok 4.4: Stwórz Nowy Serwis HealthKit

Utwórz plik: `unwalk/src/services/healthKit.native.ts`

```typescript
import { HealthKit, QueryOutput } from '@perfood/capacitor-healthkit';
import { Capacitor } from '@capacitor/core';

export interface HealthKitService {
  isAvailable: () => Promise<boolean>;
  requestAuthorization: () => Promise<boolean>;
  getStepCount: (startDate: Date, endDate: Date) => Promise<number>;
  getTodaySteps: () => Promise<number>;
}

class HealthKitServiceImpl implements HealthKitService {
  
  async isAvailable(): Promise<boolean> {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
      return false;
    }
    
    try {
      const result = await HealthKit.isAvailable();
      return result.available;
    } catch {
      return false;
    }
  }

  async requestAuthorization(): Promise<boolean> {
    try {
      await HealthKit.requestAuthorization({
        read: ['steps'],
        write: [], // Opcjonalnie: write: ['steps', 'workouts']
      });
      return true;
    } catch (error) {
      console.error('❌ HealthKit authorization failed:', error);
      return false;
    }
  }

  async getStepCount(startDate: Date, endDate: Date): Promise<number> {
    try {
      const result: QueryOutput = await HealthKit.queryHKitSampleType({
        sampleName: 'HKQuantityTypeIdentifierStepCount',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 0, // 0 = all samples
      });

      if (!result.resultData || result.resultData.length === 0) {
        return 0;
      }

      // Sumuj wszystkie próbki
      const totalSteps = result.resultData.reduce((sum, sample) => {
        return sum + (parseFloat(sample.quantity) || 0);
      }, 0);

      return Math.round(totalSteps);
    } catch (error) {
      console.error('❌ Failed to fetch steps:', error);
      return 0;
    }
  }

  async getTodaySteps(): Promise<number> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    return this.getStepCount(startOfDay, now);
  }
}

export const healthKitService = new HealthKitServiceImpl();
```

### Krok 4.5: Aktualizuj Hook `useHealthKit`

Otwórz: `unwalk/src/hooks/useHealthKit.ts` (jeśli nie istnieje, stwórz)

```typescript
import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { healthKitService } from '../services/healthKit.native';

export function useHealthKit() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [todaySteps, setTodaySteps] = useState(0);

  useEffect(() => {
    checkAvailability();
  }, []);

  async function checkAvailability() {
    const available = await healthKitService.isAvailable();
    setIsAvailable(available);
  }

  async function requestPermission(): Promise<boolean> {
    const granted = await healthKitService.requestAuthorization();
    setIsAuthorized(granted);
    return granted;
  }

  async function syncSteps() {
    if (!isAuthorized) {
      console.warn('⚠️ HealthKit not authorized');
      return 0;
    }

    const steps = await healthKitService.getTodaySteps();
    setTodaySteps(steps);
    return steps;
  }

  async function getStepsForDateRange(start: Date, end: Date): Promise<number> {
    if (!isAuthorized) return 0;
    return healthKitService.getStepCount(start, end);
  }

  return {
    isAvailable,
    isAuthorized,
    todaySteps,
    requestPermission,
    syncSteps,
    getStepsForDateRange,
    isNative: Capacitor.isNativePlatform(),
  };
}
```

### Krok 4.6: Integracja w Komponencie Dashboard

Przykład użycia w `Dashboard.tsx`:

```typescript
import { useHealthKit } from '../hooks/useHealthKit';

function Dashboard() {
  const { 
    isAvailable, 
    isAuthorized, 
    todaySteps, 
    requestPermission, 
    syncSteps,
    isNative
  } = useHealthKit();

  useEffect(() => {
    if (isNative && isAvailable && !isAuthorized) {
      requestPermission();
    }
  }, [isAvailable, isAuthorized, isNative]);

  useEffect(() => {
    if (isAuthorized) {
      syncSteps(); // Początkowa synchronizacja
      
      // Synchronizuj co 5 minut
      const interval = setInterval(syncSteps, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isAuthorized]);

  // ... reszta komponentu
}
```

---

## 5. Build i Testowanie

### Krok 5.1: Build Projektu
```bash
# Build web assets
npm run build

# Sync z iOS
npx cap sync ios

# Otwórz w Xcode
npx cap open ios
```

### Krok 5.2: Konfiguracja Signing w Xcode

W Xcode:
1. Wybierz projekt **App**
2. Zakładka **Signing & Capabilities**
3. **Team:** Wybierz swój Apple Developer account
4. **Bundle Identifier:** `com.movee.app` (musi być unikalny)
5. Zaznacz **Automatically manage signing**

### Krok 5.3: Testowanie na Symulatorze

**Uwaga:** HealthKit **nie działa** na symulatorze! Musisz testować na fizycznym urządzeniu.

```bash
# W Xcode naciśnij Cmd+R lub kliknij Play
# Wybierz symulator iPhone (np. iPhone 15 Pro)
```

### Krok 5.4: Testowanie na Fizycznym Urządzeniu

1. Podłącz iPhone kablem USB do Mac
2. Odblokuj telefon i zaufaj komputerowi
3. W Xcode: **Product → Destination → Twój iPhone**
4. Naciśnij **Cmd+R** (Run)
5. Na telefonie: **Settings → General → VPN & Device Management**
6. Zaufaj swojemu Developer Certificate

### Krok 5.5: Testowanie HealthKit Integration

Na urządzeniu:
1. Otwórz aplikację MOVEE
2. Pojawi się prompt o dostęp do Health data → **Allow**
3. Otwórz Apple Health app
4. Sprawdź czy MOVEE ma dostęp do **Steps**
5. W MOVEE sprawdź czy licznik kroków się aktualizuje

---

## 6. Publikacja w App Store

### Krok 6.1: Przygotowanie Metadata

Przygotuj:
- **Ikona aplikacji** (1024x1024px)
- **Screenshoty** (dla różnych rozmiarów iPhone)
- **Opis aplikacji** (PL i EN)
- **Keywords** (max 100 znaków)
- **Privacy Policy URL** (wymagane!)
- **Support URL**

### Krok 6.2: Stwórz App w App Store Connect

1. Zaloguj się: https://appstoreconnect.apple.com
2. **My Apps → + (New App)**
3. Wypełnij:
   - **Platform:** iOS
   - **Name:** MOVEE
   - **Primary Language:** Polish
   - **Bundle ID:** com.movee.app
   - **SKU:** MOVEE-001
   - **User Access:** Full Access

### Krok 6.3: Archive i Upload

W Xcode:
1. Wybierz **Any iOS Device (arm64)**
2. **Product → Archive**
3. Po zakończeniu: **Distribute App**
4. Wybierz **App Store Connect**
5. Wybierz **Upload**
6. Poczekaj na przetworzenie (5-30 min)

### Krok 6.4: Wypełnij Informacje w App Store Connect

**App Information:**
- Category: Health & Fitness
- Content Rights: Zawiera reklamy? (Nie)
- Age Rating: 4+ (zalecane)

**Pricing:**
- Price: Free
- Availability: Wszystkie kraje

**App Privacy:**
- Zbierane dane:
  - ✅ Health & Fitness (steps)
  - ✅ Contact Info (email)
  - ✅ User Content (photos)
- Cel: App Functionality, Analytics

**Version Information:**
- Version: 1.0.0
- Copyright: © 2025 MOVEE
- Screenshots (wymagane minimum 3)
- Description (wymagany)
- Keywords: fitness, health, walking, challenges, motivation

### Krok 6.5: Submit do Review

1. Dodaj **Test Account** (dla reviewer'ów Apple)
2. Dodaj **App Review Notes** (opcjonalnie)
3. Kliknij **Submit for Review**

**Czas review:** 1-3 dni robocze

### Krok 6.6: Co Może Pójść Źle?

Częste powody odrzucenia:
- ❌ Brak Privacy Policy
- ❌ Crash podczas testowania
- ❌ Funkcje nie działają zgodnie z opisem
- ❌ Naruszenie wytycznych (2.1, 4.3, 5.1.1)
- ❌ Metadata (screenshoty) nie odpowiadają aplikacji

**Rozwiązanie:** Popraw i wyślij ponownie (resubmit).

---

## 7. Troubleshooting

### Problem: "CocoaPods not installed"
```bash
sudo gem install cocoapods
pod repo update
cd ios/App
pod install
```

### Problem: Build Failed w Xcode
```bash
# Clean build folder
rm -rf ios/App/Pods
rm -rf ios/App/Podfile.lock
cd ios/App
pod install
```

### Problem: HealthKit nie działa
Sprawdź:
1. ✅ Info.plist ma `NSHealthShareUsageDescription`
2. ✅ HealthKit capability włączona w Xcode
3. ✅ Testujesz na **fizycznym urządzeniu** (nie symulator)
4. ✅ Użytkownik zaakceptował uprawnienia

### Problem: "This app cannot be installed"
- Sprawdź Bundle Identifier (musi być unikalny)
- Sprawdź Provisioning Profile
- Sprawdź Device registration w Developer Portal

### Problem: App Store rejection - Guideline 2.1
"App completeness"
- **Przyczyna:** Crash lub brakująca funkcjonalność
- **Fix:** Przetestuj dokładnie przed submitem, dodaj demo account

### Problem: Hot Reload nie działa
Capacitor nie wspiera hot reload jak PWA. Każda zmiana wymaga:
```bash
npm run build
npx cap sync ios
# Potem rebuild w Xcode (Cmd+B)
```

**Tip:** W development używaj `npm run dev` (PWA mode) i testuj w przeglądarce. Native testing dopiero na końcu.

---

## 📊 Porównanie: PWA vs Native (Capacitor)

| Feature | PWA (obecne) | Native (Capacitor) |
|---------|--------------|-------------------|
| HealthKit | ❌ | ✅ |
| Push Notifications | ⚠️ Ograniczone | ✅ Native |
| App Store | ❌ | ✅ |
| Offline | ✅ Service Workers | ✅ Better caching |
| Performance | 🟡 Dobra | 🟢 Lepsza |
| Install size | ~2-5 MB | ~20-40 MB |
| Update | ✅ Instant | ⚠️ App Store review |

---

## 🚀 Quick Start Checklist

```bash
✅ Instalacja Xcode + CocoaPods
✅ npm install @capacitor/core @capacitor/cli @capacitor/ios
✅ npx cap init (App: MOVEE, ID: com.movee.app)
✅ npx cap add ios
✅ npm install @perfood/capacitor-healthkit
✅ Konfiguracja Info.plist (Health permissions)
✅ Włączenie HealthKit capability w Xcode
✅ npm run build && npx cap sync ios
✅ Testowanie na urządzeniu
✅ Archive & Upload do App Store Connect
✅ Submit for Review
```

---

## 📚 Przydatne Linki

- **Capacitor Docs:** https://capacitorjs.com/docs
- **HealthKit Plugin:** https://github.com/perfood/capacitor-healthkit
- **App Store Guidelines:** https://developer.apple.com/app-store/review/guidelines/
- **App Store Connect:** https://appstoreconnect.apple.com

---

**Szacowany czas implementacji:** 3-5 dni (od zera do first build)  
**Czas na App Store approval:** 1-3 dni

**Następny krok:** Wykonaj [Krok 2: Instalacja Capacitor](#2-instalacja-capacitor)

---

**Ostatnia aktualizacja:** 16 grudnia 2025  
**Autor:** Team MOVEE  
**Status:** Ready to implement
