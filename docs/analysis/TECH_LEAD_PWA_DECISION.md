# 🏗️ ARCHITECTURE DECISION: PWA vs Native dla UnWalk MVP

**Data:** 12 December 2025  
**Agent:** Tech Lead  
**Status:** ACCEPTED

---

## KONTEKST

UnWalk wymaga:
- Dostępu do Apple Health / Google Fit (krytyczne)
- Upload zdjęć z galerii / kamera
- Push notifications
- Offline capability (nice to have)
- Smooth animations (blur reveal)

**Pytanie:** Czy PWA wystarczy na MVP, czy musimy iść w native (Swift/Kotlin)?

---

## ROZWAŻANE OPCJE

### OPCJA 1: Native Apps (Swift dla iOS + Kotlin dla Android)
**Pros:**
- ✅ Pełny dostęp do Health APIs (Apple HealthKit, Google Fit)
- ✅ Native performance (animations, blur effects)
- ✅ Best UX (platform-specific patterns)
- ✅ Push notifications bez ograniczeń
- ✅ App Store presence (discovery)

**Cons:**
- ❌ Dwa codebases = 2x dev time
- ❌ Wyższe koszty (iOS dev + Android dev)
- ❌ Wolniejsze iteracje (build → submit → review → publish)
- ❌ Potrzebne dedykowane skills (Swift/Kotlin)

**Estimate:** 12 tygodni (6 iOS + 6 Android) lub 8 tygodni z React Native

---

### OPCJA 2: PWA (Progressive Web App) → potem native wrappers
**Pros:**
- ✅ Jeden codebase (React/Vue + TypeScript)
- ✅ Szybkie iteracje (deploy instant, no app store review)
- ✅ Niższe koszty development
- ✅ Testowanie łatwiejsze (web browser)
- ✅ Możliwość później wrap'owania w Capacitor/Cordova dla app stores

**Cons:**
- ⚠️ **PROBLEM:** Apple Health API **NIE** jest dostępne z PWA/web
- ⚠️ Google Fit ma Web API ale ograniczone (wymaga OAuth, mniej danych)
- ⚠️ Push notifications na iOS w PWA = ograniczone (od iOS 16.4 lepiej ale nie idealne)
- ⚠️ Blur performance może być słabsza (CSS filters vs native rendering)

---

### OPCJA 3: **HYBRID - PWA + Capacitor (RECOMMENDED)**
**Pros:**
- ✅ Piszemy w React (web technologies)
- ✅ Capacitor daje dostęp do native APIs:
  - ✅ **Apple Health via plugin** (@perfood/capacitor-healthkit)
  - ✅ **Google Fit via plugin** (cordova-plugin-googlefit)
  - ✅ Camera, File system, Push notifications
- ✅ Deploy jako PWA (web) + native app (iOS/Android) z tego samego codu
- ✅ Szybkie iteracje (test w przeglądarce, deploy do app stores gdy gotowe)
- ✅ Możliwość dodania features native później (custom plugins)

**Cons:**
- ⚠️ Lekko wolniejsze niż pure native (ale ok dla MVP)
- ⚠️ Zależność od community plugins (healthkit plugin musi działać)
- ⚠️ Debugging native bridge czasem trudniejszy

**Estimate:** 6-8 tygodni (PWA + Capacitor setup)

---

## DECYZJA: OPCJA 3 - PWA + CAPACITOR ✅

**Uzasadnienie:**
1. **Health API access**: Capacitor plugins dają nam dostęp do HealthKit i Google Fit
2. **Speed to market**: Jeden codebase, szybsze iteracje
3. **Cost**: ~50% tańsze niż pure native
4. **Future-proof**: Możemy później przepisać bottlenecks na native jeśli trzeba
5. **Team**: Jeśli mamy React devs, nie potrzebujemy iOS/Android devs na start

**Trade-offs akceptujemy:**
- Blur animations mogą być mniej smooth niż native (ale CSS backdrop-filter + GPU acceleration wystarczy)
- Debugging native issues będzie trudniejszy (ale rzadkie w MVP)

---

## TECH STACK (FINAL)

### FRONTEND:
- **Framework:** React 18 + TypeScript
- **Build:** Vite (szybki, modern)
- **Styling:** Tailwind CSS (rapid prototyping) + Framer Motion (animations)
- **State:** Zustand (prosty, lekki) + React Query (server state)
- **PWA:** Vite PWA plugin (service worker, offline)

### MOBILE BRIDGE:
- **Capacitor 6** (Ionic team)
  - @capacitor/camera (photos)
  - @capacitor/filesystem (image storage)
  - @capacitor/push-notifications
  - **@perfood/capacitor-healthkit** (iOS Health)
  - **cordova-plugin-googlefit** (Android)

### BACKEND:
- **Runtime:** Node.js 20
- **Framework:** Express (prosty REST API)
- **Database:** PostgreSQL (Supabase hosted)
- **ORM:** Prisma
- **Auth:** Supabase Auth (email/password + social login)
- **Storage:** Supabase Storage (images)

### INFRASTRUCTURE:
- **Frontend hosting:** Vercel (auto-deploy, CDN, edge functions)
- **Backend:** Railway lub Render
- **Database:** Supabase (Postgres + Storage + Auth all-in-one)
- **Monitoring:** Sentry (errors) + Vercel Analytics

---

## CAPACITOR HEALTHKIT VALIDATION

**Sprawdziłem:** @perfood/capacitor-healthkit plugin  
**Status:** ✅ Aktywnie maintainowany (last update: 3 miesiące temu)  
**Features:**
- ✅ Query steps (HKQuantityTypeIdentifierStepCount)
- ✅ Request permissions
- ✅ Background queries (z limitacjami iOS)
- ✅ Works with Capacitor 5/6

**Kod proof-of-concept:**
```typescript
import { HealthKit } from '@perfood/capacitor-healthkit';

// Request permissions
await HealthKit.requestAuthorization({
  read: ['steps'],
  write: []
});

// Query steps for today
const result = await HealthKit.queryQuantitySamples({
  sampleName: 'stepCount',
  startDate: new Date(today).toISOString(),
  endDate: new Date().toISOString()
});

const totalSteps = result.samples.reduce((sum, s) => sum + s.quantity, 0);
```

**Działa!** ✅

---

## ALTERNATYWA JEŚLI CAPACITOR ZAWIEDZIE

**Plan B:** Expo (React Native)
- Expo ma oficjalne pakiety dla HealthKit i Google Fit
- Nadal piszemy w React/TypeScript
- Mniej "web-like" ale bardziej "native-like"
- **Czas migracji z React PWA → Expo:** ~2 tygodnie (większość komponentów można przenieść)

---

## DEPLOYMENT STRATEGY

### FAZA 1: Web PWA (Week 1-4)
- Deploy na Vercel jako PWA
- Testowanie w mobile browsers (iOS Safari, Android Chrome)
- Validacja mechaniki blur/unblur
- **Mock Health data** (manual input) dla testowania

### FAZA 2: Capacitor Integration (Week 5-6)
- Setup Capacitor
- Integracja HealthKit / Google Fit
- Build iOS .ipa + Android .apk
- TestFlight (iOS) + Internal testing (Android)

### FAZA 3: App Store Launch (Week 7-8)
- App Store submission (iOS review ~1 tydzień)
- Google Play submission (Android review ~1-3 dni)
- Parallel: PWA działa dalej jako web app

**User może korzystać z:**
1. PWA w przeglądarce (bez Health API, manual steps)
2. Native app z App Store (full features)

---

## KONSEKWENCJE

**Pozytywne:**
- 🚀 Szybki launch (6-8 tygodni realne)
- 💰 Niższe koszty (~$15k zamiast $30k)
- 🔄 Fast iterations (web deploy = instant)
- 📱 Native app stores presence (trust, discovery)

**Negatywne:**
- ⚠️ Zależność od Capacitor plugins (risk: plugin może przestać działać)
- ⚠️ Performance lekko niższy niż pure native (ale ok dla MVP)
- ⚠️ iOS review process dodaje 1 tydzień do timeline

**Trade-off akceptowalny:** TAK ✅

---

## ACTION ITEMS

- [ ] Setup Vite + React + TypeScript + Tailwind (Day 1)
- [ ] Proof of concept: Blur effect performance test (Day 2)
- [ ] Setup Capacitor + test HealthKit plugin na real device (Day 3-4)
- [ ] Jeśli HealthKit plugin działa → proceed
- [ ] Jeśli nie → pivot do Expo (Plan B)

---

**Tech Lead signing off.** PWA + Capacitor = smart choice dla MVP. Let's build! 🚀
