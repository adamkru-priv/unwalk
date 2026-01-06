import posthogWeb from 'posthog-js';

// 🎯 Get platform (web/ios/android)
const getPlatform = (): string => {
  if (typeof window === 'undefined') return 'unknown';
  
  // Check if running in Capacitor (native)
  if ((window as any).Capacitor) {
    const platform = (window as any).Capacitor.platform;
    return platform || 'native';
  }
  
  // Fallback to web
  return 'web';
};

const isNativePlatform = (): boolean => {
  const platform = getPlatform();
  return platform === 'ios' || platform === 'android';
};

// 🎯 Analytics Events - wszystkie eventy które trackujesz
export const AnalyticsEvents = {
  // 🔐 Authentication
  APP_OPENED: 'app_opened',
  SIGNUP_STARTED: 'signup_started',
  SIGNUP_COMPLETED: 'signup_completed',
  LOGIN_COMPLETED: 'login_completed',
  LOGOUT: 'logout',
  
  // 👤 User Profile
  PROFILE_VIEWED: 'profile_viewed',
  PROFILE_UPDATED: 'profile_updated',
  AVATAR_CHANGED: 'avatar_changed',
  DAILY_GOAL_SET: 'daily_goal_set',
  
  // 🏃 Challenges
  CHALLENGE_VIEWED: 'challenge_viewed',
  CHALLENGE_STARTED: 'challenge_started',
  CHALLENGE_COMPLETED: 'challenge_completed',
  CHALLENGE_FAILED: 'challenge_failed',
  CHALLENGE_CANCELLED: 'challenge_cancelled',
  
  // 👥 Team
  TEAM_MEMBER_INVITED: 'team_member_invited',
  TEAM_INVITATION_ACCEPTED: 'team_invitation_accepted',
  TEAM_INVITATION_REJECTED: 'team_invitation_rejected',
  TEAM_CHALLENGE_CREATED: 'team_challenge_created',
  TEAM_CHALLENGE_JOINED: 'team_challenge_joined',
  
  // 📊 Daily Activity
  STEPS_SYNCED: 'steps_synced',
  DAILY_GOAL_REACHED: 'daily_goal_reached',
  STREAK_MILESTONE: 'streak_milestone',
  
  // 🎁 Rewards
  XP_EARNED: 'xp_earned',
  LEVEL_UP: 'level_up',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  
  // 📱 Navigation
  SCREEN_VIEWED: 'screen_viewed',
  TAB_CHANGED: 'tab_changed',
  
  // 💰 Monetization (przyszłość)
  PREMIUM_VIEWED: 'premium_viewed',
  PREMIUM_PURCHASED: 'premium_purchased',
  
  // ❌ Errors
  ERROR_OCCURRED: 'error_occurred',
} as const;

// 🎯 Screen Names - nazwy ekranów
export const ScreenNames = {
  HOME: 'home',
  DAILY: 'daily',
  SOLO_CHALLENGE: 'solo_challenge',
  TEAM_CHALLENGE: 'team_challenge',
  PROFILE: 'profile',
  TEAM: 'team',
  STATS: 'stats',
  LEADERBOARD: 'leaderboard',
  CHALLENGES_LIST: 'challenges_list',
  CHALLENGE_DETAIL: 'challenge_detail',
} as const;

// 🎯 User Properties - właściwości użytkownika
interface UserProperties {
  user_id?: string;
  email?: string;
  display_name?: string;
  is_guest?: boolean;
  total_xp?: number;
  daily_goal?: number;
  current_streak?: number;
  challenges_completed?: number;
  team_size?: number;
  signup_date?: string;
  last_active?: string;
}

class AnalyticsService {
  private isInitialized = false;
  // Note: userId stored for future use with advanced features
  // @ts-ignore - userId will be used when implementing user segmentation
  private userId: string | null = null;
  private posthog: any = null;

  // 🎯 Initialize PostHog
  async init() {
    if (this.isInitialized) return;

    try {
      // 🔧 PostHog configuration from environment variables
      const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
      const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

      if (!POSTHOG_KEY) {
        console.warn('⚠️ PostHog not configured - analytics disabled');
        return;
      }

      const platform = getPlatform();
      console.log('🎯 Initializing PostHog for platform:', platform);

      // 🎯 For now, always use web version (posthog-js works on all platforms via Capacitor WebView)
      // Native SDK has bundling issues with Vite
      this.posthog = posthogWeb;
      
      posthogWeb.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        autocapture: false,
        capture_pageview: false,
        persistence: 'localStorage',
        loaded: () => {
          console.log('✅ PostHog initialized for platform:', platform);
        },
      });

      this.isInitialized = true;
      
      // Track app opened
      this.track(AnalyticsEvents.APP_OPENED, {
        platform,
        app_version: '3.0.1',
      });
    } catch (error) {
      console.error('❌ Failed to initialize PostHog:', error);
    }
  }

  // 🎯 Identify user (call after login/signup)
  identify(userId: string, properties?: UserProperties) {
    if (!this.isInitialized || !this.posthog) return;

    this.userId = userId;
    this.posthog.identify(userId, properties);
    console.log('👤 User identified:', userId);
  }

  // 🎯 Reset (call on logout)
  reset() {
    if (!this.isInitialized || !this.posthog) return;

    this.userId = null;
    this.posthog.reset();
    console.log('🔄 Analytics reset');
  }

  // 🎯 Track event
  track(eventName: string, properties?: Record<string, any>) {
    if (!this.isInitialized || !this.posthog) {
      console.log('📊 [Analytics] Would track:', eventName, properties);
      return;
    }

    this.posthog.capture(eventName, {
      ...properties,
      timestamp: new Date().toISOString(),
      platform: getPlatform(),
    });
    
    console.log('📊 Tracked:', eventName, properties);
  }

  // 🎯 Track screen view
  trackScreen(screenName: string, properties?: Record<string, any>) {
    this.track(AnalyticsEvents.SCREEN_VIEWED, {
      screen_name: screenName,
      ...properties,
    });
  }

  // 🎯 Update user properties
  setUserProperties(properties: UserProperties) {
    if (!this.isInitialized || !this.posthog) return;

    this.posthog.setPersonProperties(properties);
    console.log('👤 User properties updated:', properties);
  }

  // 🎯 Track error
  trackError(error: Error, context?: Record<string, any>) {
    this.track(AnalyticsEvents.ERROR_OCCURRED, {
      error_message: error.message,
      error_stack: error.stack,
      ...context,
    });
  }

  // 🎯 Start session recording (for debugging - web only)
  startSessionRecording() {
    if (!this.isInitialized || !this.posthog || isNativePlatform()) return;
    this.posthog.startSessionRecording();
  }

  // 🎯 Stop session recording
  stopSessionRecording() {
    if (!this.isInitialized || !this.posthog || isNativePlatform()) return;
    this.posthog.stopSessionRecording();
  }

  // 🎯 Feature flags (for A/B testing)
  isFeatureEnabled(featureName: string): boolean {
    if (!this.isInitialized || !this.posthog) return false;
    return this.posthog.isFeatureEnabled(featureName) || false;
  }

  // 🎯 Get feature flag variant
  getFeatureFlagVariant(featureName: string): string | boolean {
    if (!this.isInitialized || !this.posthog) return false;
    return this.posthog.getFeatureFlag(featureName) || false;
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();
