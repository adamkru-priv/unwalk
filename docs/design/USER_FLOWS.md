# 🗺️ USER FLOWS - UnWalk MVP

**Data:** 12 December 2025  
**Agent:** UX/UI Designer

---

## FLOW 1: Pierwszy kontakt z aplikacją (First-Time User)

### ENTRY POINT:
User otwiera aplikację po raz pierwszy (download z App Store lub otwarcie PWA)

### KROKI (HAPPY PATH):

**1. Splash Screen (0.5s)**
→ Logo UnWalk + tagline "Move. Reveal. Unlock."

**2. Onboarding Screen 1/3**
- **Visual:** Animacja: rozmyty obraz → sharp image (loop)
- **Headline:** "Your steps unlock hidden images"
- **Subtext:** "Turn walking into a visual journey"
- **CTA:** "Next" button
- **Secondary:** "Skip" (top right)

**3. Onboarding Screen 2/3**
- **Visual:** Ilustracja: smartwatch + steps → progres bar rośnie
- **Headline:** "Walk at your own pace"
- **Subtext:** "5k, 10k, or 30k steps - you choose the challenge"
- **CTA:** "Next" button
- **Secondary:** "Skip" (top right)

**4. Onboarding Screen 3/3**
- **Visual:** Ikona Apple Health / Google Fit
- **Headline:** "Connect your steps"
- **Subtext:** "We read from Apple Health - your data stays private"
- **CTA:** "Connect Apple Health" (primary button)
- **Secondary:** "Skip for now" (text link)

**5a. Health Permission Dialog (iOS Native)**
→ System dialog: "UnWalk would like to access Steps"
→ User taps "Allow"

**5b. Success State**
- **Visual:** Checkmark animation ✓
- **Text:** "Connected! Your steps are syncing."
- **CTA:** "Create First Challenge" (auto-redirect after 1s)

---

**ALTERNATIVE PATH 1: User taps "Skip" on onboarding**
→ Go directly to Dashboard (empty state)
→ CTA: "Create Your First Challenge"
→ W background: Pokaz persistent banner "Connect Health to track steps"

**ALTERNATIVE PATH 2: User denies Health permissions**
→ Show error state:
- **Icon:** ⚠️
- **Text:** "Without Apple Health, we can't track your steps"
- **CTA:** "Open Settings" (deep link to iOS Settings)
- **Secondary:** "Try Again"

---

## FLOW 2: Tworzenie Challenge (Solo Mode)

### ENTRY POINT:
User na Dashboard (pusty) → kliknął "Create Challenge"

### KROKI:

**1. Screen: Choose Your Goal**
- **Headline:** "How far will you walk?"
- **Options (cards):**
  - [ ] 5,000 steps (Easy - ~4km, ~1 day)
  - [ ] 10,000 steps (Medium - ~8km, ~1-2 days)
  - [ ] 15,000 steps (Hard - ~12km, ~2-3 days)
  - [ ] 30,000 steps (Epic - ~24km, ~1 week)
- **Visual:** Each card shows icon + estimated time
- **CTA:** Disabled until user selects one
- **Note:** "We'll track steps from when you start"

User taps "10,000 steps"

**2. Screen: Upload Your Reward**
- **Headline:** "What will you unlock?"
- **Subtext:** "Choose an image that motivates you"
- **Options:**
  - [📷 Take Photo] (opens camera)
  - [🖼️ Choose from Gallery] (opens photo picker)
- **Examples (small previews):**
  - "A vacation photo"
  - "A goal you're working towards"
  - "A surprise for yourself"

User taps "Choose from Gallery" → picks image

**3. Screen: Preview (before starting)**
- **Visual (main):** Uploaded image with HEAVY blur (30px)
  - Occupies 60% of screen
  - Subtle pulsing animation (breathe effect)
- **Info card (below image):**
  - Goal: 10,000 steps
  - Progress: 0 / 10,000 (0%)
  - Progress bar: empty, gray
- **CTA:** "Start Challenge" (big primary button)
- **Secondary:** "Change Image" or "Back"

User taps "Start Challenge"

**4. Success micro-animation**
- Quick confetti burst
- Sound effect (optional, respects silent mode)
- Text overlay: "Challenge started! Let's move 🚀"
- Auto-redirect to Dashboard (now shows active challenge)

---

**EDGE CASES:**

**EC1: User tries to start second challenge (MVP limit = 1)**
→ Show modal:
- "You already have an active challenge"
- "Finish it first to start a new one"
- CTA: "View Active Challenge"

**EC2: User uploads extremely small image (<500px)**
→ Show warning: "Image is too small. Choose a larger photo for best effect."

**EC3: User uploads non-image file**
→ System prevents (photo picker only shows images)

---

## FLOW 3: Śledzenie Postępu (Active Challenge)

### ENTRY POINT:
User wraca do aplikacji, ma aktywny challenge

### KROKI:

**1. Dashboard (Main Screen)**
- **Header:**
  - App logo (top left)
  - Settings icon (top right)
  - Current date + "Good morning, [name]" (if we have name)
  
- **Active Challenge Card (hero element):**
  - Rozmyty obraz (current blur state)
  - Overlay gradient (bottom)
  - Progress info:
    - "5,234 / 10,000 steps" (52%)
    - Progress bar (filled 52%, green gradient)
    - "4,766 steps to go!"
  - **CTA:** "View Details" or card itself is tappable

- **Pull-to-refresh:** Sync latest steps from Health

User taps Challenge Card

**2. Challenge Detail Screen**
- **Visual (main):** Larger view of blurred image (70% screen)
  - Zoom-in animation on enter
  - Current blur state
  - **No pinch-to-zoom** (prevent cheating)

- **Stats section:**
  - Goal: 10,000 steps
  - Current: 5,234 steps (52%)
  - Remaining: 4,766 steps
  - Est. completion: "~2 more days" (based on avg daily steps)

- **Progress bar (detailed):**
  - Milestones marked: 25%, 50%, 75%, 100%
  - Current position indicator

- **CTA:** "Refresh Steps" (manual sync)
- **Secondary:** "Cancel Challenge" (destructive, requires confirmation)

---

**AUTOMATIC UPDATES:**

**Trigger 1: App opens**
→ Instant sync with Health API
→ Update progress bar + blur state
→ If new milestone reached → show celebration micro-animation

**Trigger 2: Background fetch (daily)**
→ Check new steps
→ Update progress
→ Send push notification if milestone reached

---

**VISUAL FEEDBACK ON PROGRESS:**

**At 25% (2,500 steps):**
- Small confetti animation
- Toast notification: "🎉 25% done! Keep moving!"
- Blur reduces slightly (30px → 23px) - still very blurry

**At 50% (5,000 steps):**
- Bigger celebration
- Toast: "💪 Halfway there!"
- Blur: 23px → 15px - hints of colors visible

**At 75% (7,500 steps):**
- Toast: "🔥 Almost there! 75% done!"
- Blur: 15px → 8px - shapes becoming visible but details unclear

**At 99% (9,900 steps):**
- Blur: 8px → 3px - tantalizing close but NOT sharp
- Toast: "Only 100 steps left! Finish strong!"

---

## FLOW 4: Ukończenie Challenge

### TRIGGER:
Steps >= 10,000 → Progress = 100%

### KROKI:

**1. Automatic detection**
- App detects progress = 100%
- Trigger celebration sequence

**2. Fullscreen Success Animation**
- Screen dims
- Blurred image CENTER screen
- Blur animates from 3px → 0px over 2 seconds (smooth ease-out)
- Confetti explosion from center
- **Sound:** Success chime (respects silent mode)
- Text overlay (fades in): "🎉 Challenge Complete!"

**3. Success Screen (static)**
- **Sharp image displayed** (no blur, full glory)
- **Stats card (overlay, bottom):**
  - "You walked 10,000 steps!"
  - "Completed in 3 days"
  - (Optional) Share icon

- **Actions:**
  - [💾 Save to Gallery] (primary button)
  - [🔗 Share] (secondary button)
  - [🚀 Start New Challenge] (tertiary, text link)

User taps "Save to Gallery"

**4. Save confirmation**
- System permission dialog (if first time)
- Success toast: "Image saved! ✓"
- Button changes to "Saved ✓" (disabled, green)

User taps "Start New Challenge"

**5. Return to Create Challenge flow**
- Previous challenge removed from Dashboard
- Start fresh challenge creation (Flow 2)

---

**EDGE CASES:**

**EC1: User closes app at 99%, completes challenge in background**
→ Next app open: Fullscreen celebration triggers immediately
→ Push notification sent: "🎉 You did it! Your image is unlocked."

**EC2: User denies Gallery save permission**
→ Show error: "Can't save without permission"
→ CTA: "Open Settings"

---

## FLOW 5: Settings & Health Reconnection

### ENTRY POINT:
User taps Settings icon (Dashboard top right)

### SCREENS:

**Settings Screen:**
- **Account section:**
  - Email (if logged in)
  - "Sign out"

- **Health Integration:**
  - Apple Health: ✓ Connected (green)
  - Tap → "Reconnect" or "Disconnect"

- **Notifications:**
  - Push notifications: ON/OFF toggle
  - "Milestone alerts"
  - "Daily reminders"

- **About:**
  - App version
  - Privacy Policy
  - Terms of Service
  - "Contact Support"

---

**EDGE CASE: Health disconnected**
→ Dashboard shows warning banner:
- "⚠️ Apple Health disconnected - steps not syncing"
- CTA: "Reconnect"

User taps "Reconnect"
→ Show Health permission dialog again
→ If allowed → "Reconnected ✓"

---

## NAVIGATION STRUCTURE (MVP)

```
App Root
├── Onboarding (first launch only)
│   └── (3 screens, swipeable)
├── Dashboard (main screen)
│   ├── Empty state → Create Challenge
│   └── Active Challenge Card → Detail Screen
├── Create Challenge Flow
│   ├── Choose Goal
│   ├── Upload Image
│   └── Preview & Start
├── Challenge Detail
│   └── (View progress, refresh, cancel)
├── Success Screen (after completion)
│   └── Save / Share / New Challenge
└── Settings
    └── (Health, Notifications, About)
```

**Bottom nav:** NONE (MVP = single main screen, flows are modals/fullscreen)

---

## KEY UX PRINCIPLES

### 1. **Progressive Disclosure**
Don't overwhelm user with all features at once:
- Onboarding shows core concept in 3 steps
- Settings hidden until needed
- Advanced features (share, stats) appear after first completion

### 2. **Instant Feedback**
Every action has immediate response:
- Tap button → animation + sound
- Pull to refresh → spinner + haptic
- Milestone reached → celebration

### 3. **Prevent Cheating (Subtle)**
- No pinch-to-zoom on blurred image
- No "skip to end" option
- Steps only from Health API (can't manually add)
- Even at 99% image stays blurred (no "close enough")

### 4. **Emotional Payoff**
- Success animation is DRAMATIC (fullscreen, sound, confetti)
- Sharp image reveal is SLOW (2 seconds) to build anticipation
- Celebration feels earned

### 5. **Reduce Friction**
- Onboarding = 3 screens max (can skip)
- Create challenge = 3 taps (goal → image → start)
- No unnecessary forms or inputs
- Auto-sync steps (no manual entry)

---

**Created:** 12 December 2025  
**Designer:** UX/UI Lead
