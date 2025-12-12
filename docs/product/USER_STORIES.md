# 📋 USER STORIES - UnWalk MVP

## EPIC 1: Onboarding & Health Integration

### US-001: Pierwszy kontakt z aplikacją
**JAKO:** Nowy użytkownik  
**CHCĘ:** Szybko zrozumieć czym jest UnWalk i jak to działa  
**ŻEBY:** Zdecydować czy chcę kontynuować

**KRYTERIA AKCEPTACJI:**
- [ ] Widzę 3 ekrany onboardingu (max 10 sekund na wszystkie)
- [ ] Ekran 1: "Ruszaj się, odkrywaj obrazy" + wizualizacja
- [ ] Ekran 2: "Twój ruch odkrywa nagrody" + przykład
- [ ] Ekran 3: "Połącz z Apple Health / Google Fit"
- [ ] Mogę pominąć onboarding ("Skip")
- [ ] Po onboardingu widzę pusty dashboard z CTA "Create First Challenge"

**PRIORYTET:** Must have (P0)  
**ESTIMATED EFFORT:** S (2 dni)

---

### US-002: Połączenie z Apple Health
**JAKO:** Użytkownik iOS  
**CHCĘ:** Połączyć aplikację z Apple Health  
**ŻEBY:** Moje kroki były automatycznie śledzone

**KRYTERIA AKCEPTACJI:**
- [ ] Widzę ekran z prośbą o uprawnienia
- [ ] System pokazuje native Apple Health permission dialog
- [ ] Jeśli zaakceptuję → widzę potwierdzenie "Connected ✓"
- [ ] Jeśli odmówię → widzę komunikat "Bez Apple Health aplikacja nie działa" + retry button
- [ ] Aplikacja prosi tylko o odczyt kroków (steps), nie o zapisu

**PRIORYTET:** Must have (P0)  
**ESTIMATED EFFORT:** M (3 dni)

---

## EPIC 2: Tworzenie Wyzwania (Solo)

### US-003: Wybranie celu kroków
**JAKO:** Użytkownik  
**CHCĘ:** Wybrać cel sportowy z predefiniowanej listy  
**ŻEBY:** Nie musieć wymyślać liczby kroków

**KRYTERIA AKCEPTACJI:**
- [ ] Widzę ekran "Choose Your Goal"
- [ ] Dostępne opcje: 5k, 10k, 15k, 30k kroków (buttony z wizualizacją)
- [ ] Po wyborze → przejście do upload zdjęcia
- [ ] Wybrany cel jest zapamiętany i widoczny w następnym kroku

**PRIORYTET:** Must have (P0)  
**ESTIMATED EFFORT:** S (1 dzień)

---

### US-004: Upload zdjęcia jako nagrody
**JAKO:** Użytkownik  
**CHCĘ:** Dodać własne zdjęcie które będzie nagrodą  
**ŻEBY:** Mieć personalną motywację

**KRYTERIA AKCEPTACJI:**
- [ ] Widzę przycisk "Upload Image"
- [ ] Mogę wybrać zdjęcie z galerii (iOS Photo Library)
- [ ] Mogę zrobić nowe zdjęcie kamerą
- [ ] Po wyborze widzę preview obrazu (normalny, nie rozmyty)
- [ ] Mogę zmienić zdjęcie ("Change Image")
- [ ] Obrazy są kompresowane do max 2MB (automatic)
- [ ] Akceptowane formaty: JPG, PNG, HEIC

**PRIORYTET:** Must have (P0)  
**ESTIMATED EFFORT:** M (2-3 dni)

---

### US-005: Podgląd rozmytego obrazu przed startem
**JAKO:** Użytkownik  
**CHCĘ:** Zobaczyć jak będzie wyglądał rozmyty obraz  
**ŻEBY:** Poczuć ciekawość i motywację

**KRYTERIA AKCEPTACJI:**
- [ ] Po uploadu widzę preview challenge:
  - Rozmyty obraz (blur 30px)
  - Cel: "15,000 steps"
  - Progress bar: 0%
- [ ] Przycisk "Start Challenge"
- [ ] Przycisk "Back" (edit goal/image)
- [ ] Po kliknięciu Start → challenge jest created i aktywny

**PRIORYTET:** Must have (P0)  
**ESTIMATED EFFORT:** S (1-2 dni)

---

## EPIC 3: Progresywne Odkrywanie

### US-006: Automatyczna synchronizacja kroków
**JAKO:** Użytkownik z aktywnym challenge  
**CHCĘ:** Żeby moje kroki synchronizowały się automatycznie  
**ŻEBY:** Nie musieć ręcznie odświeżać aplikacji

**KRYTERIA AKCEPTACJI:**
- [ ] Co godzinę aplikacja pobiera nowe kroki z Health API (background fetch)
- [ ] Przy otwarciu aplikacji instant sync (foreground)
- [ ] Nowe kroki dodają się do challenge progress
- [ ] Jeśli brak internetu → sync gdy połączenie wraca
- [ ] Jeśli Health API zwraca błąd → retry (max 3 próby)

**PRIORYTET:** Must have (P0)  
**ESTIMATED EFFORT:** L (5 dni - background jobs, error handling)

---

### US-007: Progres odkrywania obrazu
**JAKO:** Użytkownik  
**CHCĘ:** Widzieć jak obraz odkrywa się wraz z moimi krokami  
**ŻEBY:** Czuć postęp i motywację

**KRYTERIA AKCEPTACJI:**
- [ ] Progress bar pokazuje % ukończenia (0-100%)
- [ ] Obraz odkrywa się losowymi fragmentami (nie liniowo)
- [ ] Algorytm: blur zmniejsza się proporcjonalnie do progress
  - 0%: blur 30px
  - 50%: blur 15px
  - 99%: blur 3px
  - 100%: blur 0px (sharp)
- [ ] Fragmenty odkrywają się co 5% progress (20 milestones)
- [ ] Smooth transition (animacja 0.5s)
- [ ] Nawet przy 99% obraz jest wciąż rozmyty (nie da się rozpoznać detali)

**PRIORYTET:** Must have (P0)  
**ESTIMATED EFFORT:** XL (7 dni - algorytm odkrywania, performance)

---

### US-008: Notyfikacje o postępie
**JAKO:** Użytkownik  
**CHCĘ:** Dostawać powiadomienia gdy osiągam milestones  
**ŻEBY:** Pamiętać o challenge i czuć motywację

**KRYTERIA AKCEPTACJI:**
- [ ] Push notification przy 25% progress: "🎉 25% done! Keep moving!"
- [ ] Push notification przy 50% progress: "💪 Halfway there!"
- [ ] Push notification przy 75% progress: "🔥 Almost there! 75% done!"
- [ ] Notyfikacje tylko jeśli user ma włączone permissions
- [ ] Max 1 notyfikacja dziennie (nie spamujemy)
- [ ] Notyfikacje działają nawet gdy app jest zamknięty

**PRIORYTET:** Should have (P1)  
**ESTIMATED EFFORT:** M (3 dni)

---

## EPIC 4: Ukończenie Wyzwania

### US-009: Animacja SUCCESS
**JAKO:** Użytkownik  
**CHCĘ:** Zobaczyć satysfakcjonującą animację gdy ukończę challenge  
**ŻEBY:** Poczuć emocjonalną nagrodę za wysiłek

**KRYTERIA AKCEPTACJI:**
- [ ] Gdy progress osiągnie 100%:
  - Fullscreen animacja (confetti / blast effect)
  - Dźwięk sukcesu (opcjonalny, respektuje silent mode)
  - Obraz fade-in z blur 0px (crystal clear)
  - Tekst: "🎉 Challenge Complete!"
- [ ] Animacja trwa 2-3 sekundy
- [ ] Po animacji → ekran z sharp image + opcje

**PRIORYTET:** Must have (P0)  
**ESTIMATED EFFORT:** M (3 dni)

---

### US-010: Zapis obrazu do galerii
**JAKO:** Użytkownik  
**CHCĘ:** Zapisać odblokowany obraz do mojej galerii  
**ŻEBY:** Zachować nagrodę i móc nią się dzielić

**KRYTERIA AKCEPTACJI:**
- [ ] Przycisk "Save to Gallery"
- [ ] System prosi o uprawnienia do zapisu (iOS Photo Library)
- [ ] Obraz zapisuje się jako JPG (full quality)
- [ ] Potwierdzenie: "Image saved! ✓"
- [ ] Opcja: "Share" (system share sheet)

**PRIORYTET:** Must have (P0)  
**ESTIMATED EFFORT:** S (1 dzień)

---

### US-011: Start kolejnego challenge
**JAKO:** Użytkownik który ukończył challenge  
**CHCĘ:** Łatwo rozpocząć kolejny  
**ŻEBY:** Kontynuować motywację

**KRYTERIA AKCEPTACJI:**
- [ ] Po ukończeniu widzę przycisk "Start New Challenge"
- [ ] Kliknięcie → powrót do flow tworzenia challenge (goal + image)
- [ ] Poprzedni challenge znika z dashboardu (w MVP nie ma archiwum)

**PRIORYTET:** Must have (P0)  
**ESTIMATED EFFORT:** S (1 dzień)

---

## EPIC 5: Dashboard

### US-012: Dashboard z aktywnym challenge
**JAKO:** Użytkownik  
**CHCĘ:** Widzieć mój aktywny challenge na głównym ekranie  
**ŻEBY:** Szybko sprawdzić postęp

**KRYTERIA AKCEPTACJI:**
- [ ] Dashboard pokazuje:
  - Card z aktywnym challenge
  - Miniaturka rozmytego obrazu (current blur state)
  - Progress bar + % + "X / Y steps"
  - "Tap to view details"
- [ ] Kliknięcie w card → detail screen z większym obrazem
- [ ] Jeśli brak aktywnego challenge → "Create Your First Challenge" CTA
- [ ] Pull-to-refresh sync kroków

**PRIORYTET:** Must have (P0)  
**ESTIMATED EFFORT:** M (3 dni)

---

## DEFERRED (v2.0)

### US-013: Custom goal (wpisz własną liczbę kroków)
**PRIORYTET:** Nice to have (P2)  
**ESTIMATED EFFORT:** S

### US-014: Zapraszanie znajomego do challenge
**PRIORYTET:** Nice to have (P2) - KILLER FEATURE ale na v2  
**ESTIMATED EFFORT:** XL (wymaga auth, user system, sharing)

### US-015: Nagrody pośrednie (preview, boosty)
**PRIORYTET:** Nice to have (P2)  
**ESTIMATED EFFORT:** M

---

**Created:** 12 December 2025  
**Owner:** Product Owner
