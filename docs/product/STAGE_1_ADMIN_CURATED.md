# 🎯 STAGE 1: Admin-Curated Challenges MVP

**Version:** 1.0  
**Timeline:** 6 tygodni  
**Budget:** $24k  
**Launch Target:** Koniec Stycznia 2026

---

## 🧠 STRATEGIC RATIONALE

### Dlaczego zaczynamy od Admin-Curated?

**1. Lower Risk, Faster Launch**
- No auth system (guest mode)
- No user-to-user relationships
- No invite/sharing complexity
- **Result:** Ship w 6 tygodni zamiast 12

**2. Test Core Mechanics First**
- Blur algorithm effectiveness
- Step sync reliability
- Progress tracking UX
- Completion rate (target: >40%)

**3. Build Valuable Content Library**
- 20-30 high-quality challenges
- Different categories (travel, art, motivation, funny)
- Multiple difficulty levels
- **Reuse w Stage 2:** User może remix admin challenges

**4. Marketing Story**
- "Odkrywaj piękne obrazy przez ruch"
- Generic appeal (no need for friend network)
- Easy to demo/showcase
- **Product Hunt ready**

---

## 🎁 CO USER DOSTAJE (Stage 1)

### **Onboarding:**
1. Welcome screen: "Odkrywaj obrazy przez ruch"
2. Pick your first challenge (3 presets, easy start)
3. Connect Health (Apple/Google)
4. Challenge starts!

### **Challenge Library:**
- 20-30 gotowych challenges
- Kategoryzowane:
  - 🌍 **Travel:** "Reveal Mount Fuji" (15k steps)
  - 🎨 **Art:** "Discover Van Gogh" (10k steps)
  - 💪 **Motivation:** "Unlock your strength" (30k steps)
  - 😂 **Fun:** "What's behind the blur?" (5k steps)
  
- Każdy challenge ma:
  - Tytuł + opis
  - Goal (steps)
  - Kategoria/tag
  - Difficulty (easy/medium/hard)
  - Estimated time (3 days, 1 week, 2 weeks)

### **Active Challenge:**
- 1 aktywny challenge na raz (KISS)
- Dashboard z blur progress
- Auto-sync co godzinę
- Milestones notifications (25%, 50%, 75%)

### **Completion:**
- Success animation
- Sharp image reveal
- Save to gallery
- **CTA:** "Start Next Challenge" → back to library

### **Profile (Simple):**
- Total steps walked (all time)
- Challenges completed (count)
- Favorite category
- No social features yet

---

## 🏗️ ARCHITECTURE (Stage 1)

### **Frontend:**
```
App.tsx
├── Onboarding (new user)
├── ChallengeLibrary (browse & pick)
├── Dashboard (active challenge + stats)
├── ChallengeDetail (expanded view)
└── Success (completion screen)
```

### **Backend (Supabase):**

**Tables:**
```sql
-- Admin tworzy te challenges ręcznie w Supabase Dashboard
admin_challenges (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  description text,
  category text,  -- 'travel', 'art', 'motivation', 'fun'
  difficulty text, -- 'easy', 'medium', 'hard'
  goal_steps int NOT NULL,
  image_url text NOT NULL,
  sort_order int,  -- kolejność wyświetlania
  is_active boolean DEFAULT true
)

-- User challenges (anonymous/guest mode)
user_challenges (
  id uuid PRIMARY KEY,
  device_id text,  -- localStorage UUID (no auth!)
  admin_challenge_id uuid REFERENCES admin_challenges,
  current_steps int DEFAULT 0,
  status text,  -- 'active', 'completed'
  started_at timestamp,
  completed_at timestamp
)

-- Simple analytics
challenge_stats (
  challenge_id uuid,
  started_count int,
  completed_count int,
  avg_completion_days decimal
)
```

### **Key Decision: NO AUTH in Stage 1** 🔑

**Guest Mode:**
- Generate `device_id` (UUID) w localStorage
- User może używać app bez signup
- Challenges są przypisane do `device_id`
- **Benefit:** Zero friction, instant use
- **Trade-off:** Brak sync między urządzeniami

**Migration Path (Stage 2):**
- Gdy user signup → migruj challenges z `device_id` do `user_id`
- "Sign up to save your progress across devices"

---

## �� USER FLOWS (Stage 1)

### **Flow 1: First Time User**
```
1. Open app
2. Onboarding (3 slides)
3. "Connect Health" (Apple/Google)
4. Permissions granted
5. → Challenge Library (auto-navigate)
6. Browse 20-30 challenges
7. Pick one (e.g., "Reveal Mount Fuji - 15k steps")
8. Preview: blurred image + info
9. "Start Challenge" button
10. → Dashboard (challenge active)
```

### **Flow 2: Daily Usage**
```
1. Open app
2. → Dashboard (auto-load)
3. See progress: 7,342 / 15,000 steps (49%)
4. Image partially revealed
5. Pull-to-refresh (manual sync)
6. Continue walking...
7. (Next day) Progress updated automatically
```

### **Flow 3: Completion**
```
1. Reach 15,000 steps
2. App detects completion (sync)
3. Push notification: "You did it! 🎉"
4. Open app → Success screen
5. Confetti animation
6. Sharp image reveal (Mount Fuji)
7. "Save to Gallery" button
8. "Start Next Challenge" → back to library
```

### **Flow 4: Browse While Active**
```
1. Dashboard → "Browse More" button
2. → Challenge Library
3. See upcoming challenges (greyed out)
4. "Complete current challenge to unlock"
5. (Nie może start drugiego challenge)
```

---

## 🎨 ADMIN PANEL (Simple)

### **Gdzie:** Supabase Dashboard (no custom UI needed)

**Admin może:**
1. Add new challenge:
   - Title, description, category, difficulty
   - Goal steps
   - Upload image (Supabase Storage)
   - Set `is_active = true`
   
2. Edit existing challenge:
   - Update text/image
   - Change difficulty/category
   - Toggle `is_active` (hide/show)
   
3. View stats:
   - Query `challenge_stats` table
   - See which challenges are popular
   - Completion rates

### **Content Strategy:**

**Launch with 20 challenges:**
- 5x Easy (5k steps) - onboarding friendly
- 10x Medium (10-15k steps) - sweet spot
- 5x Hard (30k+ steps) - aspirational

**Categories (equal split):**
- 🌍 Travel (Mount Fuji, Eiffel Tower, Grand Canyon)
- 🎨 Art (Van Gogh, Monet, street art)
- 💪 Motivation (quotes, symbols)
- 😂 Fun (memes, cute animals, surprises)

**Post-launch:**
- Add 5 new challenges per week
- Rotate based on seasons (Christmas, summer vacations)
- User feedback → new categories

---

## 🔧 TECHNICAL IMPLEMENTATION

### **Health API Integration:**

**iOS (HealthKit via Capacitor):**
```typescript
import { HealthKit } from '@capacitor-community/healthkit';

// Request permissions
await HealthKit.requestAuthorization({
  read: ['steps']
});

// Query steps (today)
const steps = await HealthKit.queryHKitSampleType({
  sampleName: 'stepCount',
  startDate: startOfDay,
  endDate: now
});
```

**Android (Google Fit via Capacitor):**
```typescript
import { GoogleFit } from '@capacitor-community/google-fit';

// Similar API
const steps = await GoogleFit.getSteps({
  startDate: startOfDay,
  endDate: now
});
```

**Sync Strategy:**
- **On app open:** Immediate sync
- **Background:** Every 1 hour (background task)
- **Manual:** Pull-to-refresh gesture

---

### **Blur Algorithm:**

```typescript
function calculateBlurAmount(currentSteps: number, goalSteps: number): number {
  const progress = currentSteps / goalSteps;
  
  // Start blur: 30px
  // End blur: 0px
  // Easing: Cubic (slow start, fast middle, slow end)
  
  const easedProgress = easeInOutCubic(progress);
  return Math.max(0, 30 - (easedProgress * 30));
}

function easeInOutCubic(x: number): number {
  return x < 0.5 
    ? 4 * x * x * x 
    : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
```

**Visual Testing:**
- Create `/test-blur` page
- Slider 0-100% progress
- Upload test image
- See blur in real-time
- Adjust easing curve

---

### **Image Storage:**

**Supabase Storage:**
```
unwalk-images/
  challenges/
    mount-fuji.jpg
    van-gogh-starry-night.jpg
    motivational-quote-1.jpg
```

**Optimization:**
- Compress images (WebP format)
- Max size: 1920x1080px
- Thumbnail: 600x400px (for library cards)
- CDN: Supabase auto-provides

**Loading:**
- Progressive image loading
- Blur placeholder while downloading
- Cache in localStorage (PWA)

---

## 📊 SUCCESS METRICS (Stage 1)

### **Primary Metrics:**

**Activation:**
- 50%+ users connect Health API
- 40%+ users start first challenge

**Engagement:**
- 30%+ users complete first challenge
- Median time to completion: 7-14 days

**Retention:**
- 25%+ users return after completion (start 2nd challenge)
- D7 retention: >20%

### **Secondary Metrics:**

**Challenge Performance:**
- Which categories most popular?
- Which difficulty level preferred?
- Completion rate by goal (5k vs 30k)

**Technical:**
- Health sync success rate: >95%
- Blur algorithm performance (60fps)
- Image load time: <2 seconds

### **Qualitative:**

- User feedback (in-app survey post-completion)
- "Did blur effect motivate you?" (Y/N)
- "Would you invite friends?" (measure social interest for Stage 2)

---

## 🚀 GO-TO-MARKET (Stage 1)

### **Launch Strategy:**

**Week 1-2: Soft Launch**
- Friends & family (50 users)
- Gather feedback
- Fix critical bugs

**Week 3: Product Hunt Launch**
- Positioning: "Fitness app that reveals beautiful images as you walk"
- Demo video: Blur → sharp reveal
- Hunter: Find micro-influencer (fitness/design)

**Week 4+: Content Marketing**
- Blog: "I walked 100k steps to see what happens"
- Twitter thread: Behind-the-scenes
- Instagram: Before/after blur reveals
- Reddit: r/fitness, r/progresspics

### **PR Angle:**

"Anti-Gamification Fitness App Uses Beautiful Imagery Instead of Points"

- No streaks, no badges, no leaderboards
- Pure visual reward
- Backed by behavioral psychology (curiosity gap)

---

## ⏱️ TIMELINE (Stage 1)

### **Week 1-2: Setup & Health**
- [ ] Supabase project setup
- [ ] Database schema
- [ ] Capacitor integration (iOS/Android)
- [ ] HealthKit/GoogleFit connection
- [ ] Test sync reliability

### **Week 3: Challenge Library UI**
- [ ] Browse screen (grid/list)
- [ ] Challenge card design
- [ ] Filters (category, difficulty)
- [ ] Detail screen (preview)
- [ ] "Start Challenge" flow

### **Week 4: Active Challenge & Progress**
- [ ] Dashboard refactor (show admin challenge)
- [ ] Blur algorithm implementation
- [ ] Progress tracking
- [ ] Auto-sync (foreground + background)
- [ ] Pull-to-refresh

### **Week 5: Success & Polish**
- [ ] Success screen animation
- [ ] Save to gallery
- [ ] Push notifications (milestones)
- [ ] Profile screen (stats)
- [ ] Bug fixes

### **Week 6: Content & Launch**
- [ ] Upload 20 admin challenges
- [ ] Test all challenges end-to-end
- [ ] App store submission (iOS/Android)
- [ ] Product Hunt preparation
- [ ] Soft launch (friends/family)

**LAUNCH:** End of Week 6 (Late January 2026)

---

## 💰 BUDGET (Stage 1)

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

## 🎯 DECISION GATES

### **After Week 3: Architecture Review**
- [ ] Health sync working reliably?
- [ ] Blur effect smooth (60fps)?
- [ ] Database schema solid?

**IF NO:** Pivot/adjust before too late

### **After Soft Launch (Week 7):**

**Metrics Check:**
- Activation rate: ___% (target: >40%)
- Completion rate: ___% (target: >30%)
- D7 retention: ___% (target: >20%)

**IF PASS → Stage 2 (User-to-User)**
**IF FAIL → Iterate Stage 1 or Kill**

---

## 🔄 TRANSITION TO STAGE 2

**When Stage 1 succeeds (>40% activation, >30% completion):**

### **Stage 2 Adds:**
1. **Auth System** (Supabase Auth)
   - Signup/login
   - Migrate guest challenges to account
   
2. **User-to-User Challenges**
   - "Create Challenge for Someone"
   - Upload custom image
   - Send invite link
   
3. **Social Features**
   - Friend list (simple)
   - "Thank sender" after completion
   
4. **Admin Challenges Still Available**
   - User can pick admin OR create custom
   - Best of both worlds

**Timeline:** +4 tygodnie after Stage 1 launch  
**Budget:** +$16k

---

## ✅ WHY STAGE 1 WILL WORK

### **1. Clear Value Prop**
"Discover beautiful images by walking"  
→ No need to explain social dynamics  
→ Instant understanding

### **2. Low Friction**
- No signup required (guest mode)
- Pick challenge → start walking
- 2 taps to value

### **3. Proven Content**
- Admin curates high-quality images
- No bad UGC (user-generated content)
- Consistent experience

### **4. Fast Launch**
- 6 weeks vs 12 weeks (social)
- Start gathering feedback sooner
- Iterate based on real usage

### **5. Foundation for Stage 2**
- Database schema supports both admin + user challenges
- UI components reusable
- Health integration done

---

## 🚫 WHAT'S OUT (Stage 1)

**Explicitly NOT included:**

- ❌ User accounts/auth (guest mode only)
- ❌ Creating custom challenges (user-to-user)
- ❌ Social features (friends, sharing, likes)
- ❌ Multiple active challenges (limit: 1)
- ❌ Challenge history/archive (just completion count)
- ❌ Monetization (free for all)
- ❌ Gamification (no badges, streaks, leaderboards)

**Rationale:** Focus on core mechanic validation. Add complexity only after proving fundamentals.

---

## 📋 USER STORIES (Stage 1)

### **US-S1-001: Browse Admin Challenges**
**JAKO:** New user  
**CHCĘ:** Zobaczyć dostępne challenges i wybrać jeden  
**ŻEBY:** Zacząć odkrywać obrazy

**AC:**
- [ ] Grid layout (2 kolumny na mobile)
- [ ] Każda karta: tytuł, kategoria, difficulty, steps
- [ ] Blur thumbnail (preview)
- [ ] Filter by category (top tabs)
- [ ] Sort by: difficulty, popularity

**PRIORYTET:** P0 Must Have  
**EFFORT:** M (3 dni)

---

### **US-S1-002: Start Admin Challenge**
**JAKO:** User  
**CHCĘ:** Rozpocząć wybrany challenge  
**ŻEBY:** Zacząć chodzić i odkrywać obraz

**AC:**
- [ ] Tap na challenge → detail screen
- [ ] Detail pokazuje: opis, goal, estimated time, rozmyty obraz
- [ ] "Start Challenge" button (primary CTA)
- [ ] Jeśli już mam aktywny → "Complete current first"
- [ ] Po start → navigate to Dashboard

**PRIORYTET:** P0 Must Have  
**EFFORT:** S (2 dni)

---

### **US-S1-003: View Active Challenge Progress**
**JAKO:** User z aktywnym challenge  
**CHCĘ:** Widzieć swój postęp i odkrywający się obraz  
**ŻEBY:** Być motywowanym do dalszego chodzenia

**AC:**
- [ ] Dashboard pokazuje: current steps, goal steps, % progress
- [ ] Blur amount zmniejsza się progresywnie
- [ ] Progress bar (animated)
- [ ] "X steps to go" text
- [ ] Tap na kartę → expanded detail view

**PRIORYTET:** P0 Must Have  
**EFFORT:** M (3 dni)

---

### **US-S1-004: Complete Challenge**
**JAKO:** User który osiągnął goal  
**CHCĘ:** Zobaczyć pełen, sharp obraz  
**ŻEBY:** Dostać emocjonalną nagrodę za wysiłek

**AC:**
- [ ] Success screen z confetti animation
- [ ] Sharp image (blur = 0px)
- [ ] Congratulations message
- [ ] "Save to Gallery" button
- [ ] "Start Next Challenge" CTA
- [ ] Stats: "You walked X steps in Y days"

**PRIORYTET:** P0 Must Have  
**EFFORT:** M (3 dni)

---

### **US-S1-005: View Profile Stats**
**JAKO:** User  
**CHCĘ:** Widzieć swoje osiągnięcia  
**ŻEBY:** Czuć progress w aplikacji

**AC:**
- [ ] Total steps walked (all challenges)
- [ ] Challenges completed (count)
- [ ] Favorite category (most picked)
- [ ] Join date (first challenge started)
- [ ] No social stats yet (Stage 2)

**PRIORYTET:** P1 Should Have  
**EFFORT:** S (1 dzień)

---

## 🔥 LET'S BUILD STAGE 1!

**Next Steps:**

1. **Zatwierdź plan Stage 1** ✅
2. **Update dokumentów** (MVP_DEFINITION.md, USER_STORIES.md)
3. **Start development:**
   - Supabase setup
   - Admin challenges schema
   - Challenge Library UI
4. **Upload first 5 test challenges** (proof of concept)
5. **Test blur algorithm** (create /test-blur page)

---

**Ready to start?** Let's ship Stage 1 w 6 tygodni! 🚀
