import { useEffect } from 'react';
import { useChallengeStore } from './stores/useChallengeStore';
import { useToastStore } from './stores/useToastStore';
import { ToastContainer } from './components/common/Toast';
import { OnboardingScreen } from './components/onboarding/OnboardingScreen';
import { WhoToChallengeScreen } from './components/onboarding/WhoToChallengeScreen';
import { AuthRequiredScreen } from './components/onboarding/AuthRequiredScreen';
import { HomeScreen } from './components/home/HomeScreen';
import { Dashboard } from './components/dashboard/Dashboard';
import { ChallengeLibrary } from './components/challenge/ChallengeLibrary';
import { TeamScreen } from './components/team/TeamScreen';
import { StatsScreen } from './components/stats/StatsScreen';
import { ProfileScreen } from './components/profile/ProfileScreen';
import { BadgesScreen } from './components/badges/BadgesScreen';
import { authService } from './lib/auth';
import { getActiveUserChallenge, getPausedChallenges } from './lib/api';
import { supabase } from './lib/supabase';
import './lib/authDebug'; // Debug helper

function App() {
  const isOnboardingComplete = useChallengeStore((s) => s.isOnboardingComplete);
  const currentScreen = useChallengeStore((s) => s.currentScreen);
  const theme = useChallengeStore((s) => s.theme) || 'dark'; // ✅ Fallback to 'dark'
  const setActiveChallenge = useChallengeStore((s) => s.setActiveChallenge);
  const setPausedChallenges = useChallengeStore((s) => s.setPausedChallenges);
  const setUserTier = useChallengeStore((s) => s.setUserTier);
  const setDailyStepGoal = useChallengeStore((s) => s.setDailyStepGoal);
  const setUserProfile = useChallengeStore((s) => s.setUserProfile); // ✅ NEW
  
  // Toast management
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  // ✅ CRITICAL FIX: Sync data from database when auth state changes
  useEffect(() => {
    let previousUserId: string | null = null;
    let isInitialized = false;

    // Initial load for guest users
    const initializeGuestData = async () => {
      try {
        console.log('👤 [App] Initializing guest data...');
        
        // Load guest profile first to confirm we're a guest
        const profile = await authService.getUserProfile();
        if (!profile) {
          console.log('⚠️ [App] No profile found');
          return;
        }

        console.log('🔍 [App] Profile loaded:', { is_guest: profile.is_guest, tier: profile.tier });

        // ✅ Save profile to store
        setUserProfile(profile);
        setUserTier(profile.tier);
        setDailyStepGoal(profile.daily_step_goal);

        // Load active challenge from database (uses device_id for guests)
        const activeChallenge = await getActiveUserChallenge();
        if (activeChallenge) {
          setActiveChallenge(activeChallenge);
          console.log('✅ [App] Loaded active challenge:', activeChallenge.admin_challenge?.title);
        } else {
          setActiveChallenge(null);
        }

        // Load paused challenges (uses device_id for guests)
        const paused = await getPausedChallenges();
        setPausedChallenges(paused);
        console.log('✅ [App] Loaded paused challenges:', paused.length);
      } catch (error) {
        console.error('❌ [App] Failed to initialize guest data:', error);
      }
    };

    // Initialize authenticated user data
    const initializeAuthenticatedData = async () => {
      try {
        console.log('✅ [App] Initializing authenticated user data...');
        
        // Load user profile
        const profile = await authService.getUserProfile();
        if (!profile) {
          console.log('⚠️ [App] No profile found for authenticated user');
          return;
        }

        console.log('🔍 [App] Authenticated profile loaded:', { 
          email: profile.email, 
          is_guest: profile.is_guest, 
          tier: profile.tier 
        });

        // ✅ Save profile to store FIRST - before loading challenges
        setUserProfile(profile);
        setUserTier(profile.tier);
        setDailyStepGoal(profile.daily_step_goal);

        // Load active challenge from database
        const activeChallenge = await getActiveUserChallenge();
        if (activeChallenge) {
          setActiveChallenge(activeChallenge);
          console.log('✅ [App] Loaded active challenge:', activeChallenge.admin_challenge?.title);
        } else {
          setActiveChallenge(null);
          console.log('ℹ️ [App] No active challenge in DB');
        }

        // Load paused challenges from database
        const paused = await getPausedChallenges();
        setPausedChallenges(paused);
        console.log('✅ [App] Loaded paused challenges:', paused.length);

      } catch (error) {
        console.error('❌ [App] Failed to initialize authenticated data:', error);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 [App] Auth state changed:', event, 'user:', session?.user?.id);

      const currentUserId = session?.user?.id || null;
      const hasEmail = !!session?.user?.email; // ✅ NEW: Check if session has email

      // Initialize on first load
      if (!isInitialized) {
        isInitialized = true;
        
        if (!currentUserId) {
          // No session - initialize as guest
          console.log('👤 [App] No session - initializing as guest');
          await initializeGuestData();
        } else if (hasEmail) {
          // ✅ Has session AND email - definitely authenticated user
          console.log('✅ [App] Authenticated user detected (has email)');
          await initializeAuthenticatedData();
        } else {
          // Has session but no email - guest user
          console.log('👤 [App] Guest user detected (no email)');
          await initializeGuestData();
        }
        
        previousUserId = currentUserId;
        return;
      }

      // Handle user ID changes (login/logout)
      if (currentUserId !== previousUserId) {
        previousUserId = currentUserId;

        if (currentUserId && hasEmail) {
          // ✅ User just logged in with email
          console.log('✅ [App] User logged in with email, loading authenticated data');
          await initializeAuthenticatedData();
        } else if (currentUserId && !hasEmail) {
          // User session but no email - guest
          console.log('👤 [App] Guest session detected');
          await initializeGuestData();
        } else {
          // User logged out
          console.log('👋 [App] User logged out, reloading guest data');
          await initializeGuestData();
        }
      }
      
      // ✅ CRITICAL: Ignore TOKEN_REFRESHED events - don't reload data!
      if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 [App] Token refreshed - keeping current data');
        return;
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [setActiveChallenge, setPausedChallenges, setUserTier, setDailyStepGoal, setUserProfile]);

  // Show initial onboarding if not completed
  if (!isOnboardingComplete) {
    return <div className={theme}><OnboardingScreen /></div>;
  }

  // Show "Who to Challenge" screen when explicitly navigated to
  if (currentScreen === 'whoToChallenge') {
    return <div className={theme}><WhoToChallengeScreen /></div>;
  }

  // Show auth screen if required (for non-self targets)
  if (currentScreen === 'auth') {
    return <div className={theme}><AuthRequiredScreen /></div>;
  }

  // Otherwise show the appropriate screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen />;
      case 'library':
      case 'challengeSelection':
        return <ChallengeLibrary />;
      case 'dashboard':
        return <Dashboard />;
      case 'team':
        return <TeamScreen />;
      case 'stats':
        return <StatsScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'badges':
        return <BadgesScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className={theme}>
      {renderScreen()}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default App;
