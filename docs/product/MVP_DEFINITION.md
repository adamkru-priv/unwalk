# 🚀 MVP SCOPE: UnWalk v1.0 (STAGE 1: Admin-Curated)

## STRATEGIC APPROACH: 3-Stage Rollout

**STAGE 1 (v1.0):** Admin-Curated Challenges - 6 tygodni ✅ **CURRENT**  
**STAGE 2 (v1.1):** User-to-User Challenges - +4 tygodnie  
**STAGE 3 (v1.2):** Viral Features & Monetization - +3 tygodnie

---

## CORE HYPOTHESIS (Stage 1)
"Wierzymy, że użytkownicy (20-40 lat, umiarkowanie aktywni) potrzebują **emocjonalnej motywacji do ruchu** silniejszej niż liczby, ponieważ tradycyjne aplikacje fitness ich nudzą. Walidujemy to przez **40% activation rate** (ukończenie pierwszego challenge) i **30% completion rate** w Stage 1."

**Stage 1 testuje:** Blur mechanika + step tracking + visual reward  
**Stage 2 testuje:** Social dynamics + user-to-user challenges  

---

## MUST-HAVE FEATURES (Stage 1)

### 1. **Onboarding & Integracja Zdrowotna** ✅
- Prosty onboarding (3 ekrany max)
- Połączenie z Apple Health (iOS) LUB Google Fit (Android)
- Prośba o uprawnienia do odczytu kroków
- **NO AUTH REQUIRED** - Guest mode (device_id w localStorage)
- **Dlaczego niezbędny:** Bez danych zdrowotnych aplikacja nie działa

### 2. **Challenge Library (Admin-Curated)** ✅ **NEW**
- Browse 20-30 gotowych challenges stworzonych przez admina
- Kategorie: 🌍 Travel, 🎨 Art, 💪 Motivation, 😂 Fun
- Filter by category & difficulty (easy/medium/hard)
- Każdy challenge: tytuł, opis, goal steps, blur thumbnail
- **Dlaczego niezbędny:** Core content - user wybiera z gotowych

### 3. **Start Admin Challenge** ✅ **NEW**
- Wybór predefiniowanego challenge z library
- Preview: rozmyty obraz, goal, estimated time
- "Start Challenge" button
- **Limit: 1 aktywny challenge** (KISS principle)
- **Dlaczego niezbędny:** Core flow - bez tego nie ma produktu

### 4. **Progresywne Odkrywanie Obrazu** ✅
- Obraz na starcie: mocno rozmyty (blur ~30px)
- Blur zmniejsza się progresywnie z postępem kroków
- Progress bar pokazujący % ukończenia
- Nawet przy 99% obraz pozostaje rozmyty
- **Dlaczego niezbędny:** To jest unikalna mechanika produktu

### 5. **Ukończenie Wyzwania** ✅
- Animacja SUCCESS przy 100%
- Pełne odsłonięcie obrazu (0 blur)
- Możliwość zapisania obrazu do galerii
- Opcja: "Start Next Challenge" → back to library
- **Dlaczego niezbędny:** Payoff emocjonalny - nagroda za wysiłek

### 6. **Dashboard z Aktywnym Wyzwaniem** ✅
- Podgląd aktywnego challenge (limit 1)
- Current steps / goal steps, % progress
- Rozmyty obraz z progressive reveal
- Pull-to-refresh (manual sync)
- **Dlaczego niezbędny:** Użytkownik musi widzieć swój postęp

### 7. **Synchronizacja Kroków (Automatyczna)** ✅
- On app open: immediate sync
- Background: co godzinę (background task)
- Manual: pull-to-refresh
- Update progress aktywnego challenge
- Notyfikacja push gdy progress przekroczy milestone (25%, 50%, 75%)
- **Dlaczego niezbędny:** Automatyka = wygoda, brak manual tracking

### 8. **Profile Stats (Simple)** ✅
- Total steps walked (all challenges)
- Challenges completed (count)
- Favorite category
- No social features (Stage 2)
- **Dlaczego niezbędny:** User widzi swoje achievements

---

## EXPLICITLY OUT OF SCOPE (Stage 1 → Stage 2)

### ❌ User Authentication (signup/login)
→ Stage 1 = Guest mode (device_id)  
→ Stage 2 = Auth + account migration

### ❌ User-Created Challenges (custom images)
→ Stage 1 = Only admin challenges  
→ Stage 2 = User może tworzyć dla innych

### ❌ User-to-User Challenges (invite links, sharing)
→ Stage 1 = Solo experience  
→ Stage 2 = Social features, invite system

### ❌ Multiple Active Challenges
→ Stage 1 = Limit 1 aktywny  
→ Stage 2 = Multiple challenges (sent + received)

### ❌ Challenge History/Archive
→ Stage 1 = Just completion count  
→ Stage 2 = Full archive with details

### ❌ Custom cele (user wpisuje własną liczbę kroków)
→ Stage 2+ - najpierw walidujemy mechanikę na predefiniowanych

### ❌ Tryb "Obraz rysuje się" (generatywny)
→ Stage 3+ - złożoność techniczna

### ❌ System Premium / Monetyzacja
→ Stage 3 - najpierw Product-Market Fit

### ❌ Inne aktywności poza krokami
→ Stage 3+ - najpierw najprostszy datasource

---

## ADMIN RESPONSIBILITIES (Stage 1)

### **Content Creation:**
- Create 20 challenges before launch
- Categories: Travel, Art, Motivation, Fun (5 each)
- Difficulty split: 5x Easy (5k), 10x Medium (10-15k), 5x Hard (30k+)
- Add 5 new challenges per week post-launch

### **Admin Panel:**
- Supabase Dashboard (no custom UI needed)
- Add/edit challenges manually
- Upload images to Supabase Storage
- Toggle `is_active` to hide/show challenges

### **Content Strategy:**
- High-quality images (1920x1080px, WebP format)
- Clear, motivating titles and descriptions
- Seasonal content (Christmas, summer, etc.)
- Test each challenge end-to-end before publish

---

## SUCCESS METRICS (Stage 1)

**Activation:**
- 50%+ users connect Health API
- 40%+ users start first challenge

**Engagement:**
- 30%+ users complete first challenge
- Median time to completion: 7-14 dni

**Retention:**
- 25%+ users start 2nd challenge after completing 1st
- D7 retention: >20%

**Challenge Performance:**
- Track which categories most popular
- Track completion rate by difficulty
- Identify best-performing challenges

**Qualitative:**
- Post-completion survey: "Did blur effect motivate you?"
- "Would you invite friends?" (gauge Stage 2 interest)
- 5+ pozytywnych testimoniali

---

## DECISION GATE: Proceed to Stage 2?

**After 4 tygodnie post-launch, evaluate:**

### ✅ GO TO STAGE 2 IF:
- Activation rate: >40%
- Completion rate: >30%
- D7 retention: >20%
- User feedback: positive about mechanic, asks for social features

### ⚠️ ITERATE STAGE 1 IF:
- Metrics: 25-35% (close but not quite)
- User feedback: "fajne ale..." (needs improvement)
- Action: Improve content, UX tweaks, more challenges

### ❌ KILL IF:
- Activation < 20%
- Completion < 15%
- D7 retention < 10%
- User feedback: "nie rozumiem po co to"

---

## TIMELINE (Stage 1)

### **Week 1-2 (Setup & Health):**
- Supabase project setup
- Database schema (admin_challenges, user_challenges)
- Capacitor integration (iOS/Android)
- HealthKit/GoogleFit connection
- Test sync reliability

### **Week 3 (Challenge Library UI):**
- Browse screen (grid layout)
- Challenge card design
- Filters (category, difficulty)
- Detail screen (preview)
- "Start Challenge" flow

### **Week 4 (Active Challenge & Progress):**
- Dashboard refactor (show admin challenge)
- Blur algorithm implementation
- Progress tracking
- Auto-sync (foreground + background)
- Pull-to-refresh

### **Week 5 (Success & Polish):**
- Success screen animation
- Save to gallery
- Push notifications (milestones)
- Profile screen (stats)
- Bug fixes

### **Week 6 (Content & Launch):**
- Upload 20 admin challenges
- Test all challenges end-to-end
- App store submission (iOS/Android)
- Product Hunt preparation
- Soft launch (friends/family)

**TARGET LAUNCH:** Koniec Stycznia 2026 (6 tygodni od dziś)

---

## BUDGET (Stage 1)

**Development:**
- Full-stack dev: 6 weeks × $4k/week = **$24k**

**Design:**
- UI/UX (challenge cards, library): **$2k**

**Infrastructure:**
- Supabase Pro: 2 months × $25 = **$50**
- Image storage: ~$20
- Push notifications (OneSignal): Free tier

**Marketing:**
- Product Hunter fee: $299
- Social media ads: $500
- Content creation: $200

**TOTAL:** ~$27k

---

## TRANSITION TO STAGE 2

**When Stage 1 succeeds (post 4-week evaluation):**

### Stage 2 Adds:
1. **Auth System** (Supabase Auth)
   - Signup/login (email + social)
   - Migrate guest challenges to account
   
2. **User-to-User Challenges**
   - "Create Challenge for Someone"
   - Upload custom image
   - Send invite link
   - Recipient accepts & starts
   
3. **Social Features**
   - Friend list (simple)
   - "Thank sender" after completion
   - Notification system
   
4. **Admin Challenges Still Available**
   - User can pick: admin challenge OR create custom
   - Best of both worlds

**Timeline:** +4 tygodnie (February 2026)  
**Budget:** +$16k

---

## WHY STAGE 1 APPROACH WORKS

### 1. **Lower Risk**
- Test core mechanic (blur + steps) without social complexity
- 60% → 30% risk of failed launch

### 2. **Faster Launch**
- 6 weeks vs 12 weeks
- Start gathering feedback sooner

### 3. **Clear Value Prop**
- "Discover beautiful images by walking"
- No need to explain social dynamics
- Instant understanding

### 4. **Low Friction**
- No signup required (guest mode)
- Pick challenge → start walking
- 2 taps to value

### 5. **Foundation for Stage 2**
- Database schema supports both admin + user challenges
- UI components reusable
- Health integration done

---

**Created:** 12 December 2025  
**Updated:** 12 December 2025 (Stage 1 approach)  
**Owner:** Product Owner
