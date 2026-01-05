# 📊 Analytics Implementation Examples

## ✅ DONE - Already Implemented
- [x] App initialization (`App.tsx`)
- [x] Analytics service (`lib/analytics.ts`)
- [x] Auto-tracking hook (`hooks/useAnalytics.ts`)

---

## 🎯 TODO - Add Tracking to These Places

### 1. **Authentication Events**
**File:** `src/components/onboarding/AuthRequiredScreen.tsx`

```typescript
// After successful login
analytics.track(AnalyticsEvents.LOGIN_COMPLETED, {
  method: 'google', // or 'apple'
  platform: Platform.OS,
});

analytics.identify(profile.id, {
  email: profile.email,
  display_name: profile.display_name,
  total_xp: profile.total_xp,
  daily_goal: profile.daily_step_goal,
  signup_date: profile.created_at,
});

// After signup
analytics.track(AnalyticsEvents.SIGNUP_COMPLETED, {
  method: 'google',
  platform: Platform.OS,
});
```

---

### 2. **Challenge Events**
**File:** `src/components/home/sections/SoloHUD.tsx`

```typescript
// When user clicks "Start Challenge"
analytics.track(AnalyticsEvents.CHALLENGE_STARTED, {
  challenge_id: challenge.id,
  challenge_title: challenge.title,
  challenge_type: 'solo',
  goal_steps: challenge.goal_steps,
  time_limit_hours: challenge.time_limit_hours,
  difficulty: challenge.difficulty,
  xp_reward: challenge.points,
});

// When challenge completed
analytics.track(AnalyticsEvents.CHALLENGE_COMPLETED, {
  challenge_id: challenge.id,
  challenge_title: challenge.title,
  final_steps: currentSteps,
  goal_steps: goalSteps,
  time_taken_hours: calculateTimeTaken(),
  xp_earned: challenge.points,
});

// When challenge failed (time expired)
analytics.track(AnalyticsEvents.CHALLENGE_FAILED, {
  challenge_id: challenge.id,
  reason: 'time_expired',
  final_steps: currentSteps,
  goal_steps: goalSteps,
});
```

---

### 3. **Team Events**
**File:** `src/components/team/TeamScreen.tsx`

```typescript
// When sending team invitation
analytics.track(AnalyticsEvents.TEAM_MEMBER_INVITED, {
  invited_user_id: invitedUserId,
  team_size: currentTeamSize,
});

// When accepting invitation
analytics.track(AnalyticsEvents.TEAM_INVITATION_ACCEPTED, {
  from_user_id: hostUserId,
});

// When starting team challenge
analytics.track(AnalyticsEvents.TEAM_CHALLENGE_CREATED, {
  challenge_id: challengeId,
  team_size: members.length,
  goal_steps: goalSteps,
});
```

---

### 4. **Daily Activity Events**
**File:** `src/components/home/sections/DailyActivityHUD.tsx`

```typescript
// When daily goal reached
if (progressPercent >= 100 && previousPercent < 100) {
  analytics.track(AnalyticsEvents.DAILY_GOAL_REACHED, {
    steps: todaySteps,
    goal: dailyStepGoal,
    time_of_day: new Date().getHours(),
  });
}

// When steps synced
analytics.track(AnalyticsEvents.STEPS_SYNCED, {
  steps: todaySteps,
  source: isNative ? 'healthkit' : 'manual',
});
```

---

### 5. **Profile Events**
**File:** `src/components/profile/ProfileScreen.tsx`

```typescript
// When user changes avatar
analytics.track(AnalyticsEvents.AVATAR_CHANGED, {
  method: 'upload', // or 'emoji'
});

// When user sets daily goal
analytics.track(AnalyticsEvents.DAILY_GOAL_SET, {
  old_goal: oldGoal,
  new_goal: newGoal,
});
```

---

### 6. **Screen Tracking** (Auto with hook)
**Add to each screen component:**

```typescript
import { useAnalytics } from '../../hooks/useAnalytics';
import { ScreenNames } from '../../lib/analytics';

export function HomeScreen() {
  useAnalytics(ScreenNames.HOME);
  // ...
}

export function TeamScreen() {
  useAnalytics(ScreenNames.TEAM);
  // ...
}

export function ProfileScreen() {
  useAnalytics(ScreenNames.PROFILE);
  // ...
}
```

---

### 7. **Error Tracking**
**Add to all try-catch blocks:**

```typescript
try {
  await startChallenge();
} catch (error) {
  analytics.trackError(error as Error, {
    context: 'start_challenge',
    challenge_id: challengeId,
    user_id: userId,
  });
  
  // Show error to user
  addToast({ message: 'Failed to start challenge', type: 'error' });
}
```

---

### 8. **XP & Rewards Events**
**File:** `src/lib/xp.ts` (or wherever XP is awarded)

```typescript
// When user earns XP
analytics.track(AnalyticsEvents.XP_EARNED, {
  amount: xpEarned,
  source: 'challenge_completed', // or 'daily_goal', 'streak', etc
  total_xp: newTotalXP,
});

// When user levels up
analytics.track(AnalyticsEvents.LEVEL_UP, {
  old_level: oldLevel,
  new_level: newLevel,
  total_xp: totalXP,
});
```

---

## 🎯 Advanced: Feature Flags (A/B Testing)

### Example: Test orange vs blue button

1. **Create feature flag in PostHog:**
   - Name: `orange-start-button`
   - Variants: `control` (blue), `test` (orange)
   - Rollout: 50/50

2. **Use in code:**
```typescript
const buttonColor = analytics.getFeatureFlagVariant('orange-start-button');

<button 
  className={
    buttonColor === 'test' 
      ? 'bg-orange-500' // Test variant
      : 'bg-blue-500'   // Control
  }
>
  Start Challenge
</button>
```

3. **Track results:**
```typescript
analytics.track('button_clicked', {
  variant: buttonColor,
  button_type: 'start_challenge',
});
```

4. **Analyze in PostHog:**
   - See which variant has higher conversion
   - Roll out winner to 100% users

---

## 📊 Dashboard Setup (PostHog)

### Create these dashboards:

1. **Overview Dashboard**
   - Daily Active Users (DAU)
   - Weekly Active Users (WAU)
   - New signups
   - Retention curve

2. **Challenges Dashboard**
   - Challenges started (daily)
   - Challenges completed (daily)
   - Completion rate
   - Most popular challenges

3. **Engagement Dashboard**
   - Screen views breakdown
   - Average session duration
   - Actions per session
   - Daily goal completion rate

4. **Team Dashboard**
   - Team invitations sent
   - Invitation acceptance rate
   - Active teams
   - Team challenge completion rate

---

## 🔔 Alerts to Set Up

1. **Error Rate Alert**
   - Trigger: Error rate > 5%
   - Action: Slack notification

2. **Retention Drop Alert**
   - Trigger: D1 retention < 35%
   - Action: Email to team

3. **Challenge Start Drop Alert**
   - Trigger: Challenge starts drop 20% week-over-week
   - Action: Investigate funnel

---

## 📈 Success Metrics to Track

### Primary Metrics (North Star)
- **DAU** (Daily Active Users) - Target: 1,000+
- **D7 Retention** - Target: 25%+
- **Challenge Completion Rate** - Target: 40%+

### Secondary Metrics
- Average challenges per user per week - Target: 2+
- Team creation rate - Target: 10% of users
- Daily goal completion rate - Target: 60%+

---

## 🎓 Next Steps

1. ✅ Setup PostHog account (5 min)
2. ✅ Add API key to `.env`
3. 🔄 Add tracking to authentication (20 min)
4. 🔄 Add tracking to challenges (30 min)
5. 🔄 Add tracking to team features (20 min)
6. 🔄 Create dashboards in PostHog (30 min)
7. 🔄 Set up alerts (15 min)

**Total time: ~2 hours for complete implementation**

---

## 🆘 Troubleshooting

### Events not showing up?
1. Check browser console for errors
2. Verify API key in `.env`
3. Check PostHog dashboard → "Live Events" tab
4. Make sure `analytics.init()` is called

### PostHog blocked by adblocker?
Use self-hosted PostHog or add reverse proxy:
```nginx
/ingest -> https://app.posthog.com
```

---

## 📚 Resources

- PostHog Docs: https://posthog.com/docs
- Event tracking guide: https://posthog.com/docs/product-analytics
- Feature flags: https://posthog.com/docs/feature-flags
- Session replay: https://posthog.com/docs/session-replay
