# MOVEE - Aplikacja Mobilna do Motywowania Aktywności Fizycznej

## 📱 Czym jest MOVEE?

**MOVEE** to innowacyjna aplikacja wellness, która przekształca aktywność fizyczną w emocjonalną podróż odkrywania. Użytkownicy odblokowują obrazy, zdjęcia i niespodzianki poprzez realizację kroków i wyzwań ruchowych.

**Tagline:** "Ruszaj się, odkrywaj, zaskakuj."

---

## 🎯 Główna Idea

**Problem:** Tradycyjne aplikacje fitness motywują liczbami i statystykami, które szybko nudzą.

**Rozwiązanie:** MOVEE tworzy emocjonalną motywację - nie liczysz kroków dla kroków, ale odkrywasz coś wartościowego (zdjęcia, prezenty od bliskich, inspirujące obrazy).

---

## 🏗️ Architektura Techniczna

### Stack Technologiczny
- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** TailwindCSS + Framer Motion (animacje)
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **State Management:** Zustand
- **Routing:** React Router DOM v7
- **Deployment:** Vercel (PWA)

### Struktura Projektu
```
unwalk/
├── src/
│   ├── components/       # Komponenty UI
│   │   ├── onboarding/  # Proces wdrażania nowego użytkownika
│   │   ├── home/        # Ekran główny z aktywnym wyzwaniem
│   │   ├── dashboard/   # Pulpit z progresem
│   │   ├── challenge/   # Biblioteka i wybór wyzwań
│   │   ├── team/        # Zarządzanie zespołem
│   │   ├── stats/       # Statystyki i historia
│   │   ├── profile/     # Profil użytkownika
│   │   ├── badges/      # System osiągnięć
│   │   └── common/      # Wspólne komponenty (Toast, Modal, etc.)
│   ├── lib/             # Logika biznesowa
│   │   ├── supabase.ts  # Konfiguracja Supabase
│   │   ├── auth.ts      # Serwis autentykacji
│   │   ├── api.ts       # API calls do backendu
│   │   └── healthKit.ts # Integracja z danymi zdrowotnymi
│   ├── stores/          # Zustand stores (stan globalny)
│   │   ├── useChallengeStore.ts  # Stan wyzwań i nawigacji
│   │   └── useToastStore.ts      # Powiadomienia
│   ├── types/           # TypeScript types/interfaces
│   ├── services/        # Dodatkowe serwisy
│   └── hooks/           # Custom React hooks
└── docs/               # Dokumentacja projektu
    ├── database/       # Migracje SQL i schemat DB
    └── product/        # Dokumentacja produktowa
```

---

## 👤 Grupy Docelowe (Persony)

### 1. **Active Romantic** (25-35 lat)
Para w związku, szukają kreatywnych sposobów na wspólne wyzwania i niespodzianki.

### 2. **Motivationless Mover** (20-40 lat)
Osoba która wie że powinna się ruszać, ale brak jej konkretnej motywacji.

### 3. **Caring Parent** (30-45 lat)
Rodzic który chce zmotywować dziecko do ruchu przez zabawę i nagrodę.

---

## 🎮 Jak Działa Aplikacja?

### 1️⃣ **Onboarding (Pierwsze Uruchomienie)**

Użytkownik przechodzi przez proces wdrażania:

1. **Wybór motywacji** - Dla kogo będzie wyzwanie?
   - `self` - Dla siebie
   - `partner` - Dla partnera/partnerki
   - `friend` - Dla przyjaciela
   - `family` - Dla rodziny

2. **Wybór poziomu** (tier):
   - `beginner` - Początkujący (3000-5000 kroków/dzień)
   - `intermediate` - Średniozaawansowany (5000-8000 kroków)
   - `advanced` - Zaawansowany (8000-12000 kroków)

3. **Wybór pierwszego wyzwania** z biblioteki predefiniowanych challenges

4. **Upload obrazu nagrody** - Użytkownik wybiera zdjęcie, które będzie odkrywał progresywnie

### 2️⃣ **Tryby Użytkownika**

#### 👤 **Tryb Gość (Guest Mode)**
- Nie wymaga rejestracji
- Dane przechowywane lokalnie z `device_id`
- Pełny dostęp do funkcji podstawowych
- Limit: maksymalnie 3 aktywne wyzwania jednocześnie
- Brak dostępu do funkcji zespołowych

#### ✅ **Tryb Zalogowany**
- Rejestracja przez email/Google
- Synchronizacja w chmurze
- Nielimitowane wyzwania
- Możliwość tworzenia zespołów
- Zapraszanie innych użytkowników
- Udostępnianie własnych wyzwań

### 3️⃣ **Cykl Życia Wyzwania (Challenge Lifecycle)**

```
1. UNCLAIMED (nieaktywne) 
   ↓ [użytkownik klika "Start Challenge"]
2. ACTIVE (aktywne)
   ↓ [użytkownik wykonuje kroki]
3. IN_PROGRESS (w trakcie realizacji)
   ↓ [osiągnięcie 100% target_steps]
4. COMPLETED (zakończone) → obraz w pełni odkryty
   
   Alternatywnie:
   - PAUSED (wstrzymane) - użytkownik może wznowić
   - ABANDONED (porzucone) - po 30 dniach bez aktywności
```

### 4️⃣ **Progresywne Odkrywanie Obrazu**

**Mechanizm "Blur → Sharp":**

1. Na początku: obraz **100% zamazany** (blur)
2. Każdy krok zmniejsza blur
3. Postęp obliczany jako: `current_steps / target_steps * 100%`
4. Obraz stopniowo się wyostrza
5. Po osiągnięciu celu: **obraz w pełni widoczny**

**Implementacja techniczna:**
- Canvas API z `filter: blur()`
- Dynamiczne przeliczanie blur radius
- Smooth transitions (Framer Motion)

---

## 🔐 System Autentykacji

### Przepływ Autentykacji

```typescript
// Guest User (brak email)
device_id → profiles (is_guest: true) → user_challenges (device_id)

// Authenticated User
email/password → Supabase Auth → profiles (is_guest: false) → user_challenges (user_id)
```

### Konwersja Gość → Zarejestrowany

Kiedy gość się rejestruje:
1. Tworzony jest pełny account w `auth.users`
2. Profil aktualizowany: `is_guest: false`, dodawany `email`
3. `device_id` zostaje zachowany (backup)
4. Wszystkie wyzwania i postęp **są zachowane**

**Funkcja:** `convert_guest_to_user(p_device_id, p_email, p_display_name)`

---

## 📊 Baza Danych - Główne Tabele

### `profiles` - Profile Użytkowników
```sql
- id (uuid, FK do auth.users)
- email (text, nullable dla gości)
- display_name (text)
- is_guest (boolean) - czy użytkownik jest gościem
- device_id (text) - unikalny ID urządzenia dla gości
- tier (text) - beginner/intermediate/advanced
- daily_step_goal (integer) - domyślny cel kroków
- avatar_url (text)
- created_at, updated_at
```

### `admin_challenges` - Predefiniowane Wyzwania
```sql
- id (uuid)
- title (text) - np. "7-Day Kickstart"
- description (text)
- difficulty (text) - beginner/intermediate/advanced
- duration_days (integer)
- target_steps (integer) - łączna liczba kroków do wykonania
- category (text) - health, travel, relationship, etc.
- image_url (text) - domyślny obraz wyzwania
- points (integer) - punkty za ukończenie
- badge_id (uuid, nullable) - przyznawana odznaka
```

### `user_challenges` - Aktywne Wyzwania Użytkowników
```sql
- id (uuid)
- user_id (uuid, nullable) - dla zalogowanych
- device_id (text, nullable) - dla gości
- admin_challenge_id (uuid) - FK do admin_challenges
- status (text) - unclaimed/active/completed/paused/abandoned
- current_steps (integer) - postęp
- target_steps (integer)
- image_url (text) - custom obraz nagrody
- started_at, completed_at, claimed_at
- last_sync_at - ostatnia synchronizacja kroków
```

### `teams` - Zespoły
```sql
- id (uuid)
- name (text)
- created_by (uuid) - założyciel
- invite_code (text) - kod zaproszeniowy
```

### `team_members` - Członkowie Zespołów
```sql
- team_id (uuid)
- user_id (uuid)
- role (text) - admin/member
- display_name (text) - spersonalizowane imię w zespole
- joined_at
```

### `badges` - Odznaki/Osiągnięcia
```sql
- id (uuid)
- name (text)
- description (text)
- icon (text) - emoji lub URL
- requirement_type (text) - steps_total/challenges_completed/streak_days
- requirement_value (integer)
```

### `user_badges` - Zdobyte Odznaki
```sql
- user_id (uuid)
- badge_id (uuid)
- earned_at (timestamp)
```

---

## 🎯 Kluczowe Funkcje i Zasady

### 1. **Synchronizacja Kroków (Health Data)**

**Web (PWA):**
- Używa Web API: `navigator.permissions.query({ name: 'step-counter' })`
- Fallback: manual input lub geolocation tracking

**iOS (przyszłość z Capacitor):**
- Integracja z HealthKit
- `HKQuantityType.stepCount`

**Zasady:**
- Synchronizacja co 5 minut podczas aktywnego wyzwania
- Dane zapisywane lokalnie (offline-first)
- Synchronizacja z backendem przy połączeniu

### 2. **System Punktów**

Użytkownicy zbierają punkty za:
- ✅ Ukończenie wyzwania: `challenge.points`
- 🏆 Zdobycie odznaki: `badge.points`
- 🔥 Seria dni z aktywnym wyzwaniem: bonus

**Przelicznik:**
- Beginner challenge: 100 pkt
- Intermediate: 250 pkt
- Advanced: 500 pkt

### 3. **System Odznak (Badges)**

Przykłady odznak:
- 🏃 **First Steps** - Ukończenie pierwszego wyzwania
- 🔥 **Streak Master** - 7 dni z rzędu
- 🏔️ **Explorer** - 50,000 kroków w sumie
- 💪 **Challenger** - 10 ukończonych wyzwań

**Auto-przyznawanie:**
- Funkcja: `check_and_award_badges(p_user_id)`
- Uruchamiana po każdym ukończeniu wyzwania

### 4. **System Zespołowy (Teams)**

**Funkcjonalności:**
- Tworzenie zespołu (wymaga konta)
- Zapraszanie przez kod lub email
- Wspólne wyzwania teamowe
- Ranking zespołowy
- Chat (przyszłość)

**Limity:**
- Max 10 członków w darmowym tierze
- Admin może usuwać członków
- Członkowie mogą opuścić zespół

### 5. **RLS (Row Level Security)**

Każda tabela ma polityki bezpieczeństwa:

```sql
-- Przykład: user_challenges
CREATE POLICY "Users can view own challenges"
ON user_challenges FOR SELECT
USING (
  (auth.uid() = user_id) OR 
  (device_id = get_device_id())
);
```

**Funkcje pomocnicze:**
- `get_device_id()` - pobiera device_id z session
- `is_team_member(team_id)` - sprawdza przynależność do zespołu

---

## 🎨 Design System i UI

### Motywy (Themes)
- **Dark Mode** (domyślny)
- **Light Mode**

Przełączanie: `useChallengeStore.setTheme('dark' | 'light')`

### Kolory (TailwindCSS)
```css
Primary: purple-600, purple-500
Success: green-500
Warning: amber-500
Error: red-500
Background: zinc-900 (dark), white (light)
```

### Komponenty Wspólne
- `Toast` - Powiadomienia toast
- `Modal` - Modale dialogowe
- `Button` - Przyciski z wariantami
- `ProgressBar` - Paski postępu
- `Card` - Karty z zawartością

### Animacje (Framer Motion)
- Fade in/out
- Slide transitions między ekranami
- Blur reveal (progresywne odkrywanie)
- Konfetti przy ukończeniu wyzwania

---

## 🚀 Przepływy Użytkownika (User Flows)

### Flow 1: Nowy Użytkownik (Guest)
```
1. Otwiera apkę po raz pierwszy
2. Widzi OnboardingScreen → wybiera motywację, tier
3. Przechodzi do biblioteki wyzwań
4. Wybiera wyzwanie + uploaduje obraz
5. Wyzwanie w statusie "unclaimed"
6. Klika "Start Challenge" → status "active"
7. Rozpoczyna chodzenie → kroki synchronizują się
8. Obraz stopniowo się odkrywa
9. Osiąga 100% → status "completed"
10. Widzi pełny obraz + konfetti + badge
```

### Flow 2: Rejestracja z Gościa
```
1. Użytkownik-gość ma aktywne wyzwania
2. Klika "Sign Up" w ProfileScreen
3. Podaje email + hasło (lub Google)
4. Backend wywołuje: convert_guest_to_user()
5. Profil aktualizowany: is_guest = false
6. Wszystkie wyzwania zachowane
7. Teraz może tworzyć zespoły i mieć nielimitowane wyzwania
```

### Flow 3: Tworzenie Zespołu
```
1. Zalogowany użytkownik → TeamScreen
2. Klika "Create Team"
3. Podaje nazwę zespołu
4. System generuje unikalny invite_code
5. Użytkownik udostępnia kod znajomym
6. Znajomi wpisują kod → dołączają do zespołu
7. Wszyscy widzą się na liście członków
8. Admin może tworzyć team challenges
```

### Flow 4: Wstrzymanie i Wznowienie
```
1. Użytkownik ma aktywne wyzwanie
2. Dashboard → klika "Pause Challenge"
3. Status: active → paused
4. Wyzwanie znika z ekranu głównego
5. Później: Dashboard → "Paused Challenges"
6. Klika "Resume" → status: paused → active
7. Wyzwanie wraca na ekran główny
```

---

## 🔌 Integracje i API

### Supabase Edge Functions

#### `accept-invitation`
Akceptowanie zaproszenia do zespołu.
```typescript
POST /functions/v1/accept-invitation
Body: { invite_code: string, display_name?: string }
```

#### `claim-challenge`
Aktywowanie wyzwania (unclaimed → active).
```typescript
POST /functions/v1/claim-challenge
Body: { user_challenge_id: uuid }
```

### Storage Buckets
- `challenge-images` - Obrazy wyzwań uploadowane przez użytkowników
- `avatars` - Zdjęcia profilowe

**Polityki:**
- Publiczny odczyt obrazów wyzwań
- Zapis tylko dla właściciela

---

## ⚙️ Zmienne Środowiskowe

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Gdzie:** `/unwalk/.env.local`

---

## 🧪 Testowanie

### Scenariusze Testowe dla QA

#### Test 1: Onboarding - Happy Path
```
✅ Użytkownik wybiera "self" → "beginner"
✅ Widzi listę challenges dla beginnerów
✅ Wybiera challenge → upload image
✅ Wyzwanie pojawia się jako "unclaimed"
✅ Start challenge → status "active"
```

#### Test 2: Synchronizacja Kroków
```
✅ Aktywne wyzwanie
✅ Symulacja kroków (manual input lub health data)
✅ current_steps się zwiększa
✅ Blur stopniowo znika
✅ Przy 100% → completed + konfetti
```

#### Test 3: Guest → Authenticated
```
✅ Gość ma 2 aktywne wyzwania
✅ Rejestruje się przez email
✅ Po rejestracji wyzwania nadal widoczne
✅ Może teraz tworzyć zespoły
```

#### Test 4: Team Invitation
```
✅ User A tworzy zespół "Fitness Crew"
✅ Otrzymuje invite_code
✅ User B wpisuje kod
✅ User B pojawia się na liście członków User A
```

#### Test 5: Pause & Resume
```
✅ Aktywne wyzwanie → Pause
✅ Znika z HomeScreen
✅ Pojawia się w "Paused Challenges"
✅ Resume → wraca na HomeScreen
✅ Progres zachowany
```

---

## 📈 Metryki Sukcesu (KPI)

### Activation Rate
**Cel: 40%+** użytkowników ukończy pierwsze wyzwanie w ciągu 7 dni.

### Retention
**Cel: 30%+** użytkowników wraca po 7 dniach.

### Engagement
**Cel:** Średnio 2+ aktywne wyzwania na użytkownika.

### Conversion (Guest → Auth)
**Cel: 20%+** gości zarejestruje się w ciągu 30 dni.

---

## 🐛 Znane Problemy i Ograniczenia

### 1. Web Health Data
- ❌ Brak natywnego dostępu do krokomierza w przeglądarce (większość urządzeń)
- ✅ Rozwiązanie: Capacitor + HealthKit/Google Fit (w planach)

### 2. Offline Mode
- ⚠️ Częściowe wsparcie - kroki zapisują się lokalnie
- ❌ Brak pełnego offline cache dla obrazów

### 3. Performance
- ⚠️ Canvas rendering blur może być wolny na starszych urządzeniach
- Optymalizacja: debounce, requestAnimationFrame

### 4. Limity Guest Mode
- Max 3 aktywne wyzwania jednocześnie
- Brak zespołów
- Dane tylko na urządzeniu (brak sync między urządzeniami)

---

## 🛠️ Development Workflow

### Uruchomienie Lokalne
```bash
cd unwalk
npm install
npm run dev
# Aplikacja dostępna na http://localhost:5173
```

### Build Production
```bash
npm run build
npm run preview  # Podgląd buildu
```

### Deploy (Vercel)
```bash
vercel --prod
```

### Migracje Bazy Danych
Wszystkie w folderze `/docs/database/`:
```bash
# Uruchom w kolejności 001, 002, 003...
psql -h db.xxx.supabase.co -U postgres -f 001_stage1_schema.sql
```

---

## 🔮 Roadmap / Przyszłe Funkcje

### Phase 1 (Q1 2026) - MVP ✅
- [x] Onboarding
- [x] Challenge library
- [x] Progressive image reveal
- [x] Guest mode
- [x] Authentication
- [x] Teams (basic)
- [x] Badges system

### Phase 2 (Q2 2026) - Native App
- [ ] Capacitor integration
- [ ] iOS app (App Store)
- [ ] HealthKit integration
- [ ] Push notifications
- [ ] Android app (Google Play)

### Phase 3 (Q3 2026) - Social
- [ ] Team challenges (wspólne cele)
- [ ] Leaderboards
- [ ] In-app chat
- [ ] Challenge sharing (social media)
- [ ] Community challenges

### Phase 4 (Q4 2026) - Monetization
- [ ] Premium tier (unlimited challenges, custom badges)
- [ ] In-app purchases (special image packs)
- [ ] Subscription model
- [ ] Partner integrations (Nike, Strava)

---

## 📞 Kontakt i Wsparcie

**Product Owner:** Adam Kruszewski  
**Zespół:** UI Designer, QA Engineer, Backend Developer

**Dokumentacja techniczna:** `/docs/`  
**Migracje DB:** `/docs/database/`  
**Product docs:** `/docs/product/`

---

## 📜 Licencja i Copyright

© 2025 MOVEE. All rights reserved.

**Status:** Private project (nie open-source)

---

**Ostatnia aktualizacja:** 16 grudnia 2025
**Wersja dokumentu:** 1.0
