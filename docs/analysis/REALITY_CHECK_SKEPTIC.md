# 😈 REALITY CHECK: UnWalk MVP

**Data:** 12 December 2025  
**Agent:** Sceptyk (Advocatus Diaboli)

---

## ⚠️ KWESTIONOWANE ZAŁOŻENIE

"Użytkownicy będą motywowani do chodzenia 15k-30k kroków dziennie tylko po to żeby odkryć zdjęcie, które sami wrzucili."

---

## 🤔 PYTANIA KRYTYCZNE

### 1. **Dlaczego user miałby wrzucić własne zdjęcie, które już ma?**
❓ Jeśli już mam to zdjęcie w galerii, jaki sens ma "odkrywanie" go?  
❓ To jak kupowanie prezentu dla siebie, rozpakowywanie go i udawanie zaskoczenia.

**KONTRARGUMENT OD PO:**  
"W MVP to validation mechaniki odkrywania. v2.0 ma challenge od innych osób - to killer feature."

**MOJA ODPOWIEDŹ:**  
To znaczy że MVP testuje **słabszą wersję** product hypothesis. Co jeśli mechanika solo nie zadziała, ale feature społecznościowy by zadziałał? Straciliśmy 3 miesiące.

**RYZYKO:** 🔴 HIGH  
**MITIGACJA:** Szybki MVP (6 tygodni zamiast 12) + w trakcie zbieraj feedback "czy chciałbyś dostać challenge od znajomego?"

---

### 2. **15k-30k kroków to 2-4 godziny chodzenia. Kto ma na to czas?**
❓ Średnia osoba robi 5-7k kroków dziennie.  
❓ 15k to ~120 minut chodzenia. Challenge który trwa 2+ tygodnie to długo na "instant gratification" generacji.

**DANE:**
- Average daily steps (USA): 4,000-5,000
- Active person: 7,000-10,000
- 15k+ = niszowa grupa

**RYZYKO:** 🟡 MEDIUM  
**MITIGACJA:**  
- Dodaj cel 5k jako default ("osiągalny w 1 dzień")
- Trackuj median czas do ukończenia - jeśli > 14 dni to red flag

---

### 3. **Konkurencja już istnieje. Dlaczego nikt tego nie skalował?**

**Podobne koncepty (sprawdziłem):**
- **Habitica:** Gamifikacja z avatar i quests - niszowy rynek
- **StepBet:** Zakłady pieniężne na kroki - legalne problemy
- **Charity Miles:** Kroki = donacje - niskie retention

❓ Jeśli nikt nie skalował "kroki jako unlock mechanizm", może jest powód?  
❓ Może fitness + wizualna nagroda to niekompatybilne kategorie?

**RYZYKO:** 🟡 MEDIUM  
**MITIGACJA:** Pre-launch: landing page + waitlist. Jeśli < 500 signups w 2 tygodnie = słaby demand.

---

### 4. **Apple Health / Google Fit integration = wysoka bariera wejścia**

❓ Users muszą:
1. Mieć iPhone/Android (nie web app)
2. Mieć włączone Health tracking
3. Dać uprawnienia aplikacji
4. Ufać że nie sprzedamy danych

Każdy krok to 20-30% drop-off w onboardingu.

**TYPOWY FUNNEL:**
- 100 downloads
- 70 ukończy onboarding (30% drop)
- 50 da uprawnienia Health (20% drop)
- 35 ukończy pierwszy challenge (15% drop)

**RYZYKO:** 🔴 HIGH (tech friction)  
**MITIGACJA:** Onboarding musi być < 30 sekund. Wyjaśnij "why" behind permissions.

---

### 5. **Co jeśli user zrobi 14,999 kroków i zapomni o aplikacji?**

99% progress but image wciąż rozmyty = frustracja zamiast motywacji.

❓ Jak przypominamy userowi?  
❓ Push notifications wymagają permissions (kolejna bariera).  
❓ Jeśli user odinstalował app po 2 tygodniach, challenge ginie?

**RYZYKO:** 🟡 MEDIUM  
**MITIGACJA:** 
- Smart notifications ("Only 500 steps left!")
- Email fallback (jeśli mamy adres)
- Grace period: progress zamraża się na 7 dni bez aktywności

---

## 💰 COST-BENEFIT ANALYSIS

### KOSZT BUDOWY MVP:

**Team (assuming solo/small team):**
- Dev (Full-stack): 3 miesiące × $8k = $24k
- Design (UI/UX): 1 miesiąc × $6k = $6k
- **Total dev cost:** $30k

**Infrastructure (monthly):**
- Backend hosting (Railway/Render): $50
- Database (Supabase/PlanetScale): $25
- CDN (image storage): $20
- Push notifications (Firebase): $0 (free tier)
- **Total monthly:** ~$100

**Marketing (launch):**
- Product Hunt campaign: $500
- Landing page + ads: $1000
- **Total:** $1,500

**TOTAL COST MVP:** $31,600

---

### SPODZIEWANE PRZYCHODY (v1.0):

**Monetyzacja:** ZERO (MVP jest free)

**ROI:** -$31,600 / $0 = -∞%

**Payback period:** NIGDY (bo nie ma revenue model)

---

### VERDICT: ⚠️ PROCEED WITH CAUTION

**Dlaczego nie "NO-GO":**
- Ciekawy pomysł z potencjałem (social feature v2)
- Nisza (relationship motivation) niewykorzystana
- Relatywnie niski koszt MVP ($30k)

**Dlaczego nie "GO":**
- Brak revenue model w MVP = burn money
- Mechanika solo może być za słaba (need validation)
- Competitive landscape pokazuje trudności ze skalowaniem

---

## 🚩 CZERWONE FLAGI

### 1. **"Feature creep" już widoczny**
MVP definition mówi "1 aktywny challenge", ale User Stories mają 12 must-haves.  
To nie jest "minimum" viable product.

**REKOMENDACJA:** Wytnij US-008 (notyfikacje o postępie) z P0. Nice to have, nie blocker.

---

### 2. **Blur algorithm complexity**
"Losowe fragmenty odkrywają się" + "blur proporcjonalnie" + "smooth animations" = non-trivial.

❓ Czy testowaliśmy czy to w ogóle wygląda dobrze?  
❓ Co jeśli blur przy 50% nadal pokazuje za dużo?

**RYZYKO:** Tech debt / przeprojektowanie  
**MITIGACJA:** Prototyp blur algorytmu W PIERWSZYM TYGODNIU. Jeśli nie działa, pivot do prostszego (pixel mosaic).

---

### 3. **Background sync = battery drain**
"Co godzinę sync z Health API" = app budzi się co godzinę = użytkownicy zobaczą w Settings "UnWalk używa 15% baterii" = uninstall.

**RYZYKO:** 🔴 HIGH (user experience)  
**MITIGACJA:** Sync tylko gdy app otwarty + daily background job (not hourly).

---

## 🎲 FAILURE SCENARIOS

### SCENARIO 1: "Nikt nie kończy challenges" (40% → 15% activation)
**Probability:** 35%  
**Skutki:** MVP failuje, pivot needed  
**Rollback:** Lessons learned, user interviews, może social feature ratuje

### SCENARIO 2: "Users kończą ale nie wracają" (D7 retention 10%)
**Probability:** 40%  
**Skutki:** Brak product-market fit dla solo mode  
**Rollback:** Prioritize v2.0 social feature szybciej

### SCENARIO 3: "Tech zbyt skomplikowany" (delays, bugs)
**Probability:** 25%  
**Skutki:** 3 miesiące → 6 miesięcy, budżet x2  
**Rollback:** Uproszczenie (remove animations, simpler blur)

---

## ✅ WARUNKI POD KTÓRYMI SIĘ ZGADZAM

### Pre-Launch Validation:
- [ ] Landing page + waitlist: Min 500 signups w 2 tygodnie
- [ ] User interviews: 10 osób z target audience potwierdzają "to ciekawe"
- [ ] Blur prototype działa i wygląda dobrze (zrób w tygodniu 1)

### During Development:
- [ ] Weekly progress demos (no waterfall)
- [ ] Max 8 tygodni dev time (nie 12)
- [ ] Feature freeze po tygodniu 6

### Post-Launch (8 tygodni):
- [ ] Activation rate > 25% (akceptowalne minimum)
- [ ] Retention D7 > 20%
- [ ] Qualitative feedback positive (NPS > 20)

**Jeśli którykolwiek metric fails → honest post-mortem i pivot/kill.**

---

## 🔥 BRUTAL TRUTHS

### 1. "Solo mode może być nudny"
Odkrywanie własnego zdjęcia to jak... patrzenie na własne zdjęcie z filtrem. Meh.

### 2. "Social feature is the REAL product"
Dostawanie challenge od dziewczyny/chłopaka/rodzica = emocja. Solo = chore.

### 3. "3 miesiące to długo bez revenue"
Startup nie może sobie pozwolić na 0 income przez Q1 2026.

---

## 💡 ALTERNATYWNA REKOMENDACJA

### **SUPER MVP (4 tygodnie zamiast 12):**

**Co wycinamy:**
- Animations (static reveal)
- Push notifications (tylko in-app)
- Background sync (manual refresh button)
- Save to gallery (just show image)

**Co zostaje:**
- Health integration
- Upload image
- Blur → unblur based on steps
- One active challenge

**Koszt:** $10k (1 miesiąc dev)  
**Learn:** Czy mechanika w ogóle angażuje

**Jeśli TAK → dodaj polish + social feature**  
**Jeśli NIE → pivot szybko, niski sunk cost**

---

## FINAL VERDICT

**STATUS:** ⚠️ PROCEED BUT SIMPLIFY

**Rekomendacja:**
1. Zrób 4-week super MVP (nie 12)
2. Pre-launch validation (landing page)
3. Blur prototype w tygodniu 1 (risk mitigation)
4. Measure everything, pivot fast if not working

**Motto:** "Build less, learn faster."

---

**Sceptyk signing off.** Powodzenia. Będę czekał z "I told you so" albo "glad I was wrong". 😏
