# Steps Service - Dokumentacja

## 📖 Co to jest?

System abstrakcji dla pobierania danych o krokach z różnych źródeł (HealthKit, Google Fit, Mock, etc.).

## 🏗️ Struktura

```
src/services/steps/
├── StepsProvider.ts        # Interface (kontrakt)
├── MockStepsProvider.ts    # Testowa implementacja
└── index.ts                # StepsService (singleton)
```

## 🎯 Jak używać?

### Podstawowe użycie

```typescript
import { stepsService } from '@/services/steps';

// Pobierz kroki za dzisiaj
const todaySteps = await stepsService.getTodaySteps();

// Pobierz kroki za konkretny dzień
const steps = await stepsService.getStepsForDate(new Date('2024-12-10'));

// Pobierz kroki za ostatnie 7 dni
const weekData = await stepsService.getLastDaysSteps(7);
```

### Sprawdź połączenie i permissions

```typescript
// Sprawdź czy mamy uprawnienia
const isConnected = await stepsService.isConnected();

if (!isConnected) {
  // Poproś o uprawnienia
  const granted = await stepsService.requestPermissions();
  
  if (granted) {
    console.log('✅ Uprawnienia przyznane');
  }
}
```

### Informacje o providerze

```typescript
const info = stepsService.getProviderInfo();
console.log(info.providerName);       // "Mock Provider (Development)"
console.log(info.canReadSteps);       // true
console.log(info.requiresPermission); // true
```

## 🧪 Testowanie

Mock Provider ma pomocniczą metodę do zmiany bazowej liczby kroków:

```typescript
// Ustaw średnią dzienna ilość na 12000 kroków
stepsService.setMockBaseSteps(12000);

// Teraz getTodaySteps() zwróci ~12000 (z losowym odchyleniem)
```

## 🚀 Jak dodać HealthKit (iOS) w przyszłości?

### Krok 1: Zainstaluj Capacitor + Plugin

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor-community/health
```

### Krok 2: Stwórz HealthKitStepsProvider

Stwórz nowy plik: `src/services/steps/HealthKitStepsProvider.ts`

```typescript
import type { StepsProvider, DailySteps, StepsProviderCapabilities } from './StepsProvider';
import { Health } from '@capacitor-community/health';

export class HealthKitStepsProvider implements StepsProvider {
  async getSteps(date: Date): Promise<number> {
    const result = await Health.querySteps({
      startDate: startOfDay(date).toISOString(),
      endDate: endOfDay(date).toISOString(),
    });
    
    return result.steps || 0;
  }

  async getTodaySteps(): Promise<number> {
    return this.getSteps(new Date());
  }

  async getStepsRange(startDate: Date, endDate: Date): Promise<DailySteps[]> {
    const result = await Health.querySteps({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    
    return result.data.map(day => ({
      date: day.date,
      steps: day.steps,
      distance: day.distance,
      calories: day.calories,
    }));
  }

  async isConnected(): Promise<boolean> {
    const result = await Health.isAvailable();
    return result.available;
  }

  async requestPermissions(): Promise<boolean> {
    const result = await Health.requestAuthorization({
      read: ['steps', 'distance', 'calories'],
      write: [],
    });
    
    return result.granted;
  }

  getCapabilities(): StepsProviderCapabilities {
    return {
      canReadSteps: true,
      canReadHistory: true,
      canWriteSteps: false,
      requiresPermission: true,
      providerName: 'Apple HealthKit',
    };
  }

  async disconnect(): Promise<void> {
    // HealthKit nie wymaga rozłączenia
  }
}
```

### Krok 3: Zaktualizuj StepsService

W pliku `src/services/steps/index.ts` zmień constructor:

```typescript
import { Capacitor } from '@capacitor/core';
import { HealthKitStepsProvider } from './HealthKitStepsProvider';
import { GoogleFitStepsProvider } from './GoogleFitStepsProvider'; // TODO
import { MockStepsProvider } from './MockStepsProvider';

private constructor() {
  // Automatycznie wybierz provider na podstawie platformy
  if (Capacitor.getPlatform() === 'ios') {
    this.provider = new HealthKitStepsProvider();
  } else if (Capacitor.getPlatform() === 'android') {
    this.provider = new GoogleFitStepsProvider();
  } else {
    // Web / Development
    this.provider = new MockStepsProvider();
  }
  
  console.log('📱 [StepsService] Initialized with:', this.provider.getCapabilities().providerName);
}
```

### Krok 4: Testuj!

Cała reszta aplikacji **nie wymaga zmian** - automatycznie będzie używać HealthKit na iOS! 🎉

## 🔄 Integracja w aplikacji

Obecnie `stepsService` jest używany w:

- ✅ `HomeScreen.tsx` - pokazuje dzisiejsze kroki i daily goal progress
- 🔜 `Dashboard.tsx` - tracking postępu wyzwania
- 🔜 `StatsScreen.tsx` - wykresy tygodniowe/miesięczne
- 🔜 `WeeklyStats.tsx` - ostatnie 7 dni

## 📝 TODO: Kolejne kroki

1. ✅ Dodaj abstrakcję (ZROBIONE!)
2. ⏳ Zaktualizuj Dashboard.tsx żeby używał stepsService
3. ⏳ Zaktualizuj StatsScreen.tsx do wykresów
4. ⏳ Dodaj automatyczne odświeżanie kroków (background refresh)
5. ⏳ Zainstaluj Capacitor
6. ⏳ Stwórz HealthKitStepsProvider
7. ⏳ Testuj na prawdziwym iPhone!

## 💡 Uwagi

- **Mock Provider** generuje realistyczne dane (weekendy = więcej kroków)
- **Kroki rosną w ciągu dnia** (symulacja prawdziwego urządzenia)
- **Odświeżanie co 5 minut** w HomeScreen (można zmienić)
- **Singleton pattern** - zawsze ta sama instancja serwisu

## 🐛 Debugging

```typescript
// Zobacz co się dzieje pod maską
console.log('[StepsService] Today:', await stepsService.getTodaySteps());
console.log('[StepsService] Provider:', stepsService.getProviderInfo());
console.log('[StepsService] Connected:', await stepsService.isConnected());
```

---

**Autor:** UnWalk Team  
**Data:** 2025-12-15  
**Status:** ✅ Ready for native app transition
