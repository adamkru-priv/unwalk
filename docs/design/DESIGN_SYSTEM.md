# 🎨 DESIGN SYSTEM - UnWalk

**Data:** 12 December 2025  
**Agent:** UX/UI Designer

---

## BRAND PERSONALITY

**Voice:** Motivational, friendly, achievement-focused  
**Vibe:** Modern, clean, energetic but not aggressive  
**Target feeling:** "I want to move to see what's hidden"

**Keywords:**
- Discover
- Unlock
- Reveal
- Progress
- Achievement

---

## COLOR PALETTE

### PRIMARY COLORS

**Brand Blue (Curiosity)**
```
Primary 600: #2563eb  ← Main CTA buttons
Primary 500: #3b82f6  ← Hover states
Primary 700: #1d4ed8  ← Active/pressed
```

**Success Green (Achievement)**
```
Green 500: #22c55e   ← Progress bars, completed states
Green 600: #16a34a   ← Hover
Green 400: #4ade80   ← Gradient start
```

### NEUTRAL COLORS

**Backgrounds**
```
White: #ffffff       ← Main background
Gray 50: #f9fafb     ← Card backgrounds
Gray 100: #f3f4f6    ← Disabled states
```

**Text**
```
Gray 900: #111827    ← Primary text (headlines)
Gray 700: #374151    ← Body text
Gray 500: #6b7280    ← Secondary text (hints)
Gray 400: #9ca3af    ← Placeholder text
```

### ACCENT COLORS

**Warning/Alert**
```
Yellow 500: #eab308  ← Warning states
Red 500: #ef4444     ← Destructive actions (cancel challenge)
```

**Blur Overlay**
```
Black opacity: rgba(0,0,0,0.4)  ← Gradient over blurred images
```

---

## TYPOGRAPHY

### FONT FAMILY

**Primary:** Inter (web-safe, excellent legibility)
```
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 
             'Segoe UI', sans-serif;
```

**Weights:**
- Regular: 400 (body text)
- Medium: 500 (labels, buttons)
- Semi-bold: 600 (card titles)
- Bold: 700 (headlines)

---

### TYPE SCALE

**Mobile (base 16px):**

```
H1 (Hero): 
  font-size: 32px (2rem)
  font-weight: 700
  line-height: 1.2
  letter-spacing: -0.02em
  Use: Page titles, big headlines

H2 (Section):
  font-size: 24px (1.5rem)
  font-weight: 600
  line-height: 1.3
  Use: Card titles, section headers

H3 (Subsection):
  font-size: 20px (1.25rem)
  font-weight: 600
  line-height: 1.4
  Use: Component headers

Body (Regular):
  font-size: 16px (1rem)
  font-weight: 400
  line-height: 1.5
  Use: Main content, descriptions

Body Small:
  font-size: 14px (0.875rem)
  font-weight: 400
  line-height: 1.5
  Use: Hints, secondary info

Caption:
  font-size: 12px (0.75rem)
  font-weight: 500
  line-height: 1.4
  color: gray-500
  Use: Timestamps, metadata
```

**Desktop:** Scale up by 1.125x (H1 → 36px, etc.)

---

## SPACING SYSTEM

**Base unit: 4px** (0.25rem)

```
xs:  4px  (0.25rem)  ← Tight spacing
sm:  8px  (0.5rem)   ← Icon margins
md:  16px (1rem)     ← Standard padding
lg:  24px (1.5rem)   ← Card padding
xl:  32px (2rem)     ← Section margins
2xl: 48px (3rem)     ← Large gaps
3xl: 64px (4rem)     ← Hero sections
```

**Application:**
- Button padding: 16px vertical, 24px horizontal (md + lg)
- Card padding: 24px (lg)
- Screen padding: 16px (md) on mobile, 24px (lg) on tablet+
- Gap between cards: 16px (md)

---

## COMPONENTS

### 1. BUTTONS

#### Primary Button (CTA)
```css
Background: #2563eb (blue-600)
Text: #ffffff
Padding: 16px 24px
Border-radius: 12px
Font: 16px, weight 600
Shadow: 0 1px 3px rgba(0,0,0,0.1)

Hover: 
  Background: #3b82f6 (blue-500)
  Shadow: 0 4px 12px rgba(37,99,235,0.2)
  
Active/Pressed:
  Background: #1d4ed8 (blue-700)
  Scale: 0.98
  
Disabled:
  Background: #e5e7eb (gray-200)
  Text: #9ca3af (gray-400)
  Cursor: not-allowed
```

**Example:**
```jsx
<button className="bg-blue-600 text-white px-6 py-4 rounded-xl 
                   font-semibold shadow-sm hover:bg-blue-500 
                   active:scale-98 transition-all">
  Start Challenge
</button>
```

---

#### Secondary Button
```css
Background: transparent
Border: 2px solid #2563eb (blue-600)
Text: #2563eb (blue-600)
Padding: 14px 22px (adjust for border)
Border-radius: 12px

Hover:
  Background: rgba(37,99,235,0.05)
  
Active:
  Background: rgba(37,99,235,0.1)
```

---

#### Tertiary Button (Text Link)
```css
Background: transparent
Text: #2563eb (blue-600)
Text-decoration: underline
Font: 16px, weight 500

Hover:
  Text: #1d4ed8 (blue-700)
  
Active:
  Text: #1e3a8a (blue-900)
```

---

#### Destructive Button (Cancel Challenge)
```css
Background: #ef4444 (red-500)
Text: #ffffff
(Same styling as primary, different color)

Hover: #dc2626 (red-600)
Active: #b91c1c (red-700)
```

---

### 2. CARDS

#### Standard Card
```css
Background: #ffffff
Border-radius: 16px
Padding: 24px
Shadow: 0 1px 3px rgba(0,0,0,0.1)
Border: 1px solid #f3f4f6 (gray-100)

Hover (if interactive):
  Shadow: 0 4px 12px rgba(0,0,0,0.08)
  Transform: translateY(-2px)
  
Active:
  Scale: 0.99
```

---

#### Challenge Card (Active)
```css
Background: #ffffff
Border-radius: 20px
Padding: 0 (image fills top)
Shadow: 0 4px 20px rgba(0,0,0,0.12)
Overflow: hidden

Structure:
  - Blurred image (aspect-ratio 4:3)
  - Gradient overlay (bottom)
  - Progress info (absolute bottom)
```

**Visual hierarchy:**
```
┌──────────────────┐
│  [Blurred Img]   │ ← 60% of card height
│                  │
│  ╔══════════════╗│
│  ║ Gradient     ║│ ← Dark → transparent
│  ║ 5,234/10,000 ║│ ← White text
│  ║ ████████░░░░ ║│ ← Green progress
│  ║ 52% complete ║│
│  ╚══════════════╝│
└──────────────────┘
```

---

### 3. PROGRESS BAR

```css
Container:
  Background: #e5e7eb (gray-200)
  Height: 8px
  Border-radius: 999px (fully rounded)
  Overflow: hidden

Fill:
  Background: linear-gradient(90deg, #4ade80, #22c55e)
  Height: 100%
  Border-radius: 999px
  Transition: width 0.5s ease-out

Animation on update:
  - Pulse effect (scale 1.05 → 1.0)
  - Duration: 0.3s
```

**With milestones:**
```css
25%, 50%, 75% markers:
  Position: absolute
  Width: 2px
  Height: 12px (extends beyond bar)
  Background: #ffffff
  Border: 1px solid #d1d5db (gray-300)
```

---

### 4. INPUT FIELDS (for v2, but define now)

```css
Background: #ffffff
Border: 2px solid #e5e7eb (gray-200)
Border-radius: 12px
Padding: 12px 16px
Font: 16px (prevent zoom on iOS)

Focus:
  Border: 2px solid #2563eb (blue-600)
  Outline: 4px solid rgba(37,99,235,0.1)
  
Error:
  Border: 2px solid #ef4444 (red-500)
  
Placeholder:
  Color: #9ca3af (gray-400)
```

---

### 5. MODALS / OVERLAYS

```css
Backdrop:
  Background: rgba(0,0,0,0.5)
  Blur: 8px (backdrop-filter)

Modal:
  Background: #ffffff
  Border-radius: 24px
  Padding: 32px
  Max-width: 400px
  Shadow: 0 20px 50px rgba(0,0,0,0.3)
  
Animation (enter):
  Fade in: opacity 0 → 1 (0.2s)
  Scale: 0.95 → 1.0 (0.3s, ease-out)
```

---

### 6. TOASTS / NOTIFICATIONS

```css
Background: #1f2937 (gray-800)
Color: #ffffff
Padding: 16px 20px
Border-radius: 12px
Shadow: 0 10px 40px rgba(0,0,0,0.3)
Max-width: 320px

Position: Fixed bottom, centered
Animation: Slide up from bottom (0.3s)
Auto-dismiss: 3 seconds

Success variant:
  Border-left: 4px solid #22c55e (green)
  
Error variant:
  Border-left: 4px solid #ef4444 (red)
```

---

## ANIMATIONS & TRANSITIONS

### Micro-interactions

**Button Press:**
```css
transform: scale(0.98);
transition: transform 0.1s ease-out;
```

**Card Hover:**
```css
transform: translateY(-4px);
box-shadow: 0 8px 24px rgba(0,0,0,0.12);
transition: all 0.3s ease-out;
```

**Blur Reveal (on progress):**
```css
/* Animate blur from 30px → 0px */
filter: blur(calc(30px * (1 - var(--progress))));
transition: filter 0.5s ease-out;
```

**Success Confetti:**
```javascript
// Use library: react-confetti or canvas-confetti
duration: 2000ms
particleCount: 200
spread: 180
origin: { x: 0.5, y: 0.5 }
```

---

### Page Transitions (React Router)

```css
Fade in (new page):
  opacity: 0 → 1
  duration: 0.3s
  easing: ease-out

Slide (navigation):
  Forward: translateX(100%) → translateX(0)
  Back: translateX(-100%) → translateX(0)
  duration: 0.4s
  easing: cubic-bezier(0.4, 0, 0.2, 1)
```

---

## BLUR ALGORITHM SPECIFICATION

**Goal:** Image reveals progressively but remains unrecognizable until 100%

**Formula:**
```javascript
// Progress: 0-100%
const blurAmount = Math.max(0, 30 - (progress * 0.3));

// Examples:
// 0%   → blur(30px)   - completely unrecognizable
// 25%  → blur(22.5px) - colors visible, no shapes
// 50%  → blur(15px)   - vague shapes, no details
// 75%  → blur(7.5px)  - shapes clear, details fuzzy
// 99%  → blur(0.3px)  - tantalizingly close but not sharp
// 100% → blur(0px)    - crystal clear
```

**CSS Implementation:**
```css
.challenge-image {
  filter: blur(var(--blur-px));
  transition: filter 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}
```

**Fragment Reveal (Alternative/Additional):**
```javascript
// Instead of just blur, reveal random fragments
// Divide image into 20x20 grid (400 tiles)
// Reveal tiles randomly as progress increases

const tilesToReveal = Math.floor((progress / 100) * 400);
// Each tile: opacity 0 → 1, from blur(30px) → blur(0px)
```

---

## ICONOGRAPHY

**Style:** Outline icons (not filled) - more modern, lightweight

**Source:** Heroicons or Lucide (MIT licensed)

**Size:**
- Small: 16px (inline with text)
- Medium: 24px (buttons, navigation)
- Large: 32px (feature highlights)

**Common Icons:**
```
⚙️  Settings (cog)
📷  Camera (camera)
🖼️  Gallery (photo)
🔄  Refresh (arrow-path)
✓   Success (check-circle)
⚠️  Warning (exclamation-triangle)
🚀  Start (rocket-launch)
💾  Save (arrow-down-tray)
🔗  Share (share)
```

---

## RESPONSIVE BREAKPOINTS

```css
/* Mobile First */
Base: 0px - 639px     (default, mobile)

sm: 640px             (large phones, landscape)
md: 768px             (tablets)
lg: 1024px            (small laptops)
xl: 1280px            (desktop)
```

**Layout Strategy:**
- **Mobile (< 640px):** 
  - Single column
  - Full-width cards
  - 16px screen padding
  
- **Tablet (640px - 1024px):**
  - Still single column (vertical app)
  - Max content width: 600px, centered
  - 24px screen padding
  
- **Desktop (> 1024px):**
  - Max width: 480px (mobile-sized)
  - Centered with gray background
  - "Best viewed on mobile" hint

---

## DARK MODE (v2.0 - out of MVP scope)

**Strategy:** CSS custom properties + prefers-color-scheme

```css
:root {
  --bg-primary: #ffffff;
  --text-primary: #111827;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #111827;
    --text-primary: #f9fafb;
  }
}
```

**Not in MVP:** Focus on light mode perfection first.

---

## LOADING STATES

### Skeleton Screens
```css
Background: linear-gradient(
  90deg,
  #f3f4f6 25%,
  #e5e7eb 50%,
  #f3f4f6 75%
);
background-size: 200% 100%;
animation: shimmer 1.5s infinite;

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

**Use for:**
- Challenge card loading
- Image upload preview
- Dashboard initial load

---

### Spinners
```css
/* Only for inline actions (refresh button) */
Border-spinner:
  border: 3px solid #e5e7eb;
  border-top-color: #2563eb;
  animation: spin 0.8s linear infinite;

Size: 24px (inline), 48px (fullscreen)
```

---

## ACCESSIBILITY CHECKLIST

**Color Contrast:**
- [ ] All text meets WCAG AA (4.5:1 minimum)
- [ ] Primary button: White on Blue-600 = 4.5:1+ ✓
- [ ] Body text: Gray-700 on White = 10:1+ ✓

**Touch Targets:**
- [ ] Minimum 44x44px (iOS guideline)
- [ ] Buttons have adequate padding
- [ ] Cards have tap zones (not just icons)

**Keyboard Navigation:**
- [ ] Tab order logical
- [ ] Focus states visible (blue outline)
- [ ] Enter/Space to activate buttons

**Screen Readers:**
- [ ] Images have alt text
- [ ] Progress bars have aria-label
- [ ] Buttons have descriptive labels

**Motion:**
- [ ] Respect prefers-reduced-motion
- [ ] Disable confetti if user prefers reduced motion

---

## EXPORT FOR DEVELOPERS

### Tailwind Config
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        success: {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        }
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    }
  }
}
```

---

## BRAND ASSETS (TODO)

**Needed for launch:**
- [ ] App icon (1024x1024, various sizes)
- [ ] Splash screen (iOS, Android)
- [ ] Logo SVG (horizontal, vertical, icon-only)
- [ ] App Store screenshots (iOS: 6.5", 5.5")
- [ ] Google Play screenshots (phone, tablet)

**Design guidelines:**
- Icon: Simple, recognizable at small sizes
- Color: Blue gradient (primary blue → lighter)
- Shape: Rounded square (iOS style)

---

**Created:** 12 December 2025  
**Designer:** UX/UI Lead

**Next Steps:**
1. Create high-fidelity mockups in Figma (optional but recommended)
2. Export assets (icons, images)
3. Hand off to Frontend Developer with this spec
4. Build React components following this system
