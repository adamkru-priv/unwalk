import { useEffect } from 'react';
import { useChallengeStore } from './stores/useChallengeStore';
import { useToastStore } from './stores/useToastStore';
import { ToastContainer } from './components/common/Toast';
import { OnboardingScreen } from './components/onboarding/OnboardingScreen';
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

function App() {
  const isOnboardingComplete = useChallengeStore((s) => s.isOnboardingComplete);
  const currentScreen = useChallengeStore((s) => s.currentScreen);
  const theme = useChallengeStore((s) => s.theme) || 'dark'; // ✅ Fallback to 'dark'
  const setActiveChallenge = useChallengeStore((s) => s.setActiveChallenge);
  const setPausedChallenges = useChallengeStore((s) => s.setPausedChallenges);
  const setUserTier = useChallengeStore((s) => s.setUserTier);
  const setDailyStepGoal = useChallengeStore((s) => s.setDailyStepGoal);
  
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

        // Set tier and daily goal from profile
        setUserTier(profile.tier);
        setDailyStepGoal(profile.daily_step_goal);
      } catch (error) {
        console.error('❌ [App] Failed to initialize guest data:', error);
      }
    };

    // Initialize authenticated user data
    const initializeAuthenticatedData = async (userId: string) => {
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

        // Set user data in store
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

      // Initialize on first load
      if (!isInitialized) {
        isInitialized = true;
        
        if (!currentUserId) {
          // No session - initialize as guest
          console.log('👤 [App] No session - initializing as guest');
          await initializeGuestData();
        } else {
          // Has session - check if real user or guest
          const profile = await authService.getUserProfile();
          
          if (profile?.is_guest) {
            console.log('👤 [App] Session detected but user is guest');
            await initializeGuestData();
          } else {
            console.log('✅ [App] Authenticated user detected');
            await initializeAuthenticatedData(currentUserId);
          }
        }
        
        previousUserId = currentUserId;
        return;
      }

      // Handle user ID changes (login/logout)
      if (currentUserId !== previousUserId) {
        previousUserId = currentUserId;

        if (currentUserId) {
          // User just logged in
          const profile = await authService.getUserProfile();
          
          if (profile?.is_guest) {
            console.log('👤 [App] Login detected but user is guest');
            await initializeGuestData();
          } else {
            console.log('✅ [App] User logged in, loading authenticated data');
            await initializeAuthenticatedData(currentUserId);
          }
        } else {
          // User logged out
          console.log('👋 [App] User logged out, reloading guest data');
          await initializeGuestData();
        }
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [setActiveChallenge, setPausedChallenges, setUserTier, setDailyStepGoal]);

  // Show onboarding if not completed
  if (!isOnboardingComplete) {
    return <div className={theme}><OnboardingScreen /></div>;
  }

  // Otherwise show the appropriate screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen />;
      case 'library':
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
