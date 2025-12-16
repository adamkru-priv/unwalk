# Onboarding Flow: "Kogo chcesz zchallengować?"

## Przegląd

Nowy krok onboardingu, który pojawia się **po podstawowym onboardingu, przed HOME**. Użytkownik wybiera cel swojej aktywności, co determinuje dalszy flow aplikacji.

## Flow użytkownika

```
Onboarding (kroki, health permissions) 
    ↓
WhoToChallengeScreen (NOWE!)
    ↓
┌─────────────────────────────────────┐
│ Wybór targetu:                      │
│ • Samego siebie                     │
│ • Żonę / Męża                       │
│ • Dziecko                           │
│ • Przyjaciela / Przyjaciółkę        │
└─────────────────────────────────────┘
    ↓
    ├─ Samego siebie → HOME (jako Guest lub zalogowany)
    │
    └─ Inne opcje → Sprawdzenie czy zalogowany
         ├─ Nie zalogowany → AuthRequiredScreen (OTP)
         └─ Zalogowany → HOME
```

## Ekrany

### 1. WhoToChallengeScreen
- **Lokalizacja**: `src/components/onboarding/WhoToChallengeScreen.tsx`
- **4 kafelki z gradientami**:
  - 🎯 Samego siebie (niebieski-fioletowy)
  - 💑 Żonę / Męża (różowy)
  - 👶 Dziecko (zielony)
  - 🤝 Przyjaciela (pomarańczowy)
- **Logika**:
  - Zapisuje wybór do `users.onboarding_target`
  - Ustawia `hasSeenWhoToChallenge = true`
  - Jeśli "samego siebie" → przechodzi do HOME
  - Jeśli inna opcja → sprawdza autoryzację

### 2. AuthRequiredScreen
- **Lokalizacja**: `src/components/onboarding/AuthRequiredScreen.tsx`
- **Flow OTP**:
  1. Krok 1: Podanie email
  2. Krok 2: Weryfikacja 6-cyfrowego kodu
- **Po weryfikacji**:
  - Konwertuje gościa na zalogowanego użytkownika
  - Ustawia `hasSeenWhoToChallenge = true`
  - Przekierowuje do HOME

## Baza danych

### Migracja: `038_onboarding_challenge_target.sql`

1. **Nowe pole w `users`**:
```sql
onboarding_target VARCHAR(20) CHECK (onboarding_target IN ('self', 'spouse', 'child', 'friend'))
```

2. **Funkcja sprawdzania limitów członków teamu**:
```sql
CREATE FUNCTION check_team_member_limit()
-- Sprawdza czy user nie przekroczył limitu:
-- Basic tier: max 1 członek
-- Pro tier: max 5 członków
```

3. **Trigger**: `enforce_team_member_limit`
- Automatycznie sprawdza limit przed dodaniem członka

4. **Helper function**: `get_team_member_stats(user_id)`
```sql
RETURNS TABLE(
  current_members INTEGER,
  max_members INTEGER,
  tier TEXT
)
```

## Store (Zustand)

### Nowe pola w `useChallengeStore`:
```typescript
hasSeenWhoToChallenge: boolean; // Czy user widział ekran wyboru
currentScreen: 'onboarding' | 'whoToChallenge' | 'auth' | 'home' | ...;
```

## Routing w App.tsx

```typescript
// 1. Podstawowy onboarding
if (!isOnboardingComplete) {
  return <OnboardingScreen />;
}

// 2. Wybór targetu (NOWE!)
if (!hasSeenWhoToChallenge && currentScreen !== 'auth') {
  return <WhoToChallengeScreen />;
}

// 3. Autoryzacja (jeśli potrzebna)
if (currentScreen === 'auth') {
  return <AuthRequiredScreen />;
}

// 4. Główne ekrany aplikacji
return renderScreen();
```

## API

### Nowa funkcja: `getTeamMemberStats()`
```typescript
// Zwraca statystyki członków teamu
{
  current_members: number,  // Aktualna liczba
  max_members: number,      // Limit (1 dla basic, 5 dla pro)
  tier: string             // 'basic' lub 'pro'
}
```

## Zasady biznesowe

### Limity członków teamu:
- **Basic tier**: max 1 osoba zaproszona
- **Pro tier**: max 5 osób zaproszonych

### Walidacja:
- Trigger w bazie danych automatycznie blokuje dodanie członka po przekroczeniu limitu
- Frontend może sprawdzić limit przed wysłaniem zaproszenia

## UX

### Przejście wstecz:
- Z `AuthRequiredScreen` → powrót do `WhoToChallengeScreen`
- User może zmienić wybór w profilu (feature do zaimplementowania)

### Komunikaty:
- "Aby challengować innych, musisz się zalogować"
- "Otrzymasz 6-cyfrowy kod weryfikacyjny na swoją skrzynkę email"

## Integracja z istniejącym flow

### Guest users:
- Mogą wybrać "samego siebie" i kontynuować jako guest
- Jeśli wybiorą inną opcję - muszą się zalogować

### Zalogowani users:
- Mogą wybrać dowolną opcję
- Jeśli mają już konto, przechodzą bezpośrednio do HOME
- Jeśli nie mają konta, przechodzą przez OTP flow

## TODO / Przyszłe usprawnienia

1. **Zmiana targetu po onboardingu**:
   - Dodać opcję w ProfileScreen do zmiany `onboarding_target`
   
2. **Personalizacja na podstawie targetu**:
   - Dostosowanie sugestii challenges do wybranego targetu
   - Inne komunikaty dla różnych targetów

3. **Quick invite flow**:
   - Po wybraniu "żona/dziecko/przyjaciel" - od razu zaproponować dodanie do teamu
   - Modal z formularzem (imię, email)

4. **Statystyki**:
   - Tracking wyborów użytkowników
   - Analytics: który target jest najpopularniejszy

## Testy

### Scenariusze do przetestowania:

1. **Guest wybiera "samego siebie"**:
   - ✓ Nie wymaga logowania
   - ✓ Przechodzi do HOME
   - ✓ Może startować challenges

2. **Guest wybiera inne opcje**:
   - ✓ Wymaga logowania
   - ✓ Po OTP staje się zalogowanym userem
   - ✓ Zachowuje dane gościa (challenges, progress)

3. **Zalogowany user wybiera dowolną opcję**:
   - ✓ Przechodzi bezpośrednio do HOME
   - ✓ Wybór zapisany w bazie

4. **Team member limits**:
   - ✓ Basic user nie może dodać 2. członka
   - ✓ Pro user może dodać do 5 członków
   - ✓ Error message przy przekroczeniu limitu

## Pliki zmienione/dodane

### Nowe pliki:
- `src/components/onboarding/WhoToChallengeScreen.tsx`
- `src/components/onboarding/AuthRequiredScreen.tsx`
- `docs/database/038_onboarding_challenge_target.sql`
- `docs/product/ONBOARDING_WHO_TO_CHALLENGE.md` (ten plik)

### Zmodyfikowane pliki:
- `src/App.tsx` - nowy routing
- `src/stores/useChallengeStore.ts` - nowe pola
- `src/lib/auth.ts` - dodane pole `onboarding_target` w UserProfile
- `src/lib/api.ts` - dodana funkcja `getTeamMemberStats()`

## Wdrożenie

1. **Uruchom migrację**:
```bash
# Wykonaj migrację w Supabase Dashboard lub przez CLI
psql -f docs/database/038_onboarding_challenge_target.sql
```

2. **Deploy aplikacji**:
```bash
cd unwalk
npm run build
# Deploy do Vercel/Netlify/własny serwer
```

3. **Testowanie**:
- Usuń dane z localStorage (`unwalk-storage`)
- Przeładuj aplikację
- Przejdź przez cały flow onboardingu

## Pytania i odpowiedzi

**Q: Co jeśli user pominie ten ekran (zamknie aplikację)?**
A: Przy następnym uruchomieniu zobaczy go ponownie, bo `hasSeenWhoToChallenge = false`.

**Q: Czy można zmienić wybór później?**
A: Obecnie nie ma UI do zmiany, ale można dodać w ProfileScreen.

**Q: Czy wybór wpływa na dostępne challenges?**
A: Obecnie nie, ale można to dodać w przyszłości (np. challenges dla dzieci).

**Q: Co jeśli user ma już team members przed tą aktualizacją?**
A: Istniejące członkowie są zachowani. Limit sprawdzany jest tylko przy dodawaniu nowych.
