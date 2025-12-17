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
  const theme = useChallengeStore((s) => s.theme) || 'dark';
  const isAppReady = useChallengeStore((s) => s.isAppReady); // ✅ NEW
  const setActiveChallenge = useChallengeStore((s) => s.setActiveChallenge);
  const setPausedChallenges = useChallengeStore((s) => s.setPausedChallenges);
  const setUserTier = useChallengeStore((s) => s.setUserTier);
  const setDailyStepGoal = useChallengeStore((s) => s.setDailyStepGoal);
  const setUserProfile = useChallengeStore((s) => s.setUserProfile);
  const setIsAppReady = useChallengeStore((s) => s.setIsAppReady); // ✅ NEW

  // Toast management
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  // ✅ CRITICAL FIX: Check store IMMEDIATELY on mount, don't wait for auth listener
  useEffect(() => {
    let previousUserId: string | null = null;
    let isInitialized = false;

    // 🚀 IMMEDIATE CHECK on component mount - don't wait for INITIAL_SESSION event!
    const checkStoreOnMount = async () => {
      console.log('🚀 [App] Component mounted - checking store immediately...');
      
      const currentProfile = useChallengeStore.getState().userProfile;
      console.log('🔍 [App] Store state on mount:', { 
        hasProfile: !!currentProfile,
        profileId: currentProfile?.id,
        profileEmail: currentProfile?.email,
        profileTier: currentProfile?.tier
      });

      // ✅ OPTIMISTIC START: If we have a profile, unlock the app IMMEDIATELY.
      // Don't wait for getSession() - it might hang or take time.
      // We will verify the session in the background.
      if (currentProfile) {
        console.log('✅ [App] Optimistic start: Store has profile, unlocking UI immediately');
        setIsAppReady(true);
        isInitialized = true; // Assume initialized for now
        previousUserId = currentProfile.id;
      }

      // Get current session (in background if profile exists, or blocking if not)
      console.log('🔍 [App] Verifying session...');
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || null;
      const hasEmail = !!session?.user?.email;
      
      console.log('🔍 [App] Session verified:', { 
        hasSession: !!session,
        userId: currentUserId,
        hasEmail
      });

      // If we optimistically unlocked, check if we were right
      if (currentProfile) {
        if (currentUserId && currentProfile.id === currentUserId) {
           console.log('✅ [App] Session matches stored profile. All good.');
           return;
        } else if (currentUserId && currentProfile.id !== currentUserId) {
           console.warn('⚠️ [App] Session user mismatch! Reloading data...');
           // Profile mismatch - we need to reload
           await initializeAuthenticatedData();
        } else if (!currentUserId) {
           console.warn('⚠️ [App] No active session found despite stored profile. Token might be expired.');
           // Let the auth listener handle sign out or token refresh
        }
        return;
      }

      // If we didn't have a profile, handle normal flow
      if (currentUserId && hasEmail) {
        console.log('⚠️ [App] Store empty but session exists - loading from API...');
        isInitialized = true;
        previousUserId = currentUserId;
        await initializeAuthenticatedData();
      } else {
        console.log('👤 [App] No authenticated session - loading guest profile...');
        // ✅ FIX: Load guest profile so UI knows user is a guest
        const guestProfile = await authService.getUserProfile();
        if (guestProfile) {
          console.log('✅ [App] Guest profile loaded:', { is_guest: guestProfile.is_guest });
          setUserProfile(guestProfile);
          setUserTier(guestProfile.tier);
          setDailyStepGoal(guestProfile.daily_step_goal);
        }
        setIsAppReady(true); // Unlock for guest/login
      }
    };

    // Run immediate check
    checkStoreOnMount();

    // Initialize authenticated user data
    const initializeAuthenticatedData = async () => {
      try {
        console.log('✅ [App] Initializing authenticated user data...');
        
        // Create a timeout for the profile fetch
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile fetch timed out')), 8000)
        );

        console.log('🔍 [App] Step 1: Loading profile from authService...');
        
        // Race against timeout
        const profile = await Promise.race([
          authService.getUserProfile(),
          timeoutPromise
        ]) as any;
        
        if (!profile) {
          console.log('⚠️ [App] No profile found for authenticated user');
          return;
        }

        console.log('🔍 [App] Step 2: Authenticated profile loaded:', { 
          email: profile.email, 
          is_guest: profile.is_guest, 
          tier: profile.tier,
          daily_step_goal: profile.daily_step_goal
        });

        console.log('🔍 [App] Step 3: Saving profile to store...');
        setUserProfile(profile);
        setUserTier(profile.tier);
        setDailyStepGoal(profile.daily_step_goal);
        console.log('✅ [App] Profile saved to store');

        console.log('🔍 [App] Step 4: Loading active challenge...');
        const activeChallenge = await getActiveUserChallenge();
        
        if (activeChallenge) {
          console.log('🔍 [App] Step 5: Active challenge found, saving to store...');
          setActiveChallenge(activeChallenge);
          console.log('✅ [App] Loaded active challenge:', activeChallenge.admin_challenge?.title);
        } else {
          console.log('🔍 [App] Step 5: No active challenge found');
          setActiveChallenge(null);
          console.log('ℹ️ [App] No active challenge in DB');
        }

        console.log('🔍 [App] Step 6: Loading paused challenges...');
        const paused = await getPausedChallenges();
        setPausedChallenges(paused);
        console.log('✅ [App] Loaded paused challenges:', paused.length);
        
        console.log('🎉 [App] Initialization complete!');

      } catch (error) {
        console.error('❌ [App] Failed to initialize authenticated data:', error);
        console.error('❌ [App] Error stack:', error instanceof Error ? error.stack : 'No stack');
      } finally {
        // ✅ CRITICAL: Always unlock the app, even if initialization failed
        console.log('🔓 [App] Unlocking app (finally block)');
        setIsAppReady(true);
      }
    };

    // ✅ Handle visibility change - refresh profile when user returns to tab
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ [App] Tab became visible - refreshing user profile');
        
        const { data: { session } } = await supabase.auth.getSession();
        const hasEmail = !!session?.user?.email;
        
        if (session?.user?.id && hasEmail) {
          const profile = await authService.getUserProfile();
          if (profile) {
            console.log('🔄 [App] Profile refreshed:', { is_guest: profile.is_guest, tier: profile.tier });
            setUserProfile(profile);
            setUserTier(profile.tier);
            setDailyStepGoal(profile.daily_step_goal);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 [App] Auth state changed:', event, 'user:', session?.user?.id);

      const currentUserId = session?.user?.id || null;
      const hasEmail = !!session?.user?.email;

      // ✅ FIX: On INITIAL_SESSION (page reload), check if store already has data
      if (event === 'INITIAL_SESSION') {
        console.log('🔄 [App] INITIAL_SESSION detected (page reload or first load)');
        isInitialized = true;
        previousUserId = currentUserId;

        // ✅ CRITICAL: Get fresh userProfile from store (not from closure!)
        const currentProfile = useChallengeStore.getState().userProfile;
        
        // If store already has user profile, DON'T reload from API!
        if (currentProfile && currentProfile.id === currentUserId) {
          console.log('✅ [App] Store already has profile data - skipping API call');
          console.log('🔍 [App] Using cached profile:', { 
            id: currentProfile.id, 
            email: currentProfile.email, 
            tier: currentProfile.tier 
          });
          return; // Skip initialization!
        }

        // Store is empty or has different user - load from API
        if (currentUserId && hasEmail) {
          console.log('✅ [App] No cached data - loading from API');
          await initializeAuthenticatedData();
        } else if (!currentUserId) {
          console.log('👤 [App] No session - user needs to sign in or use as guest');
        }
        return;
      }

      // ✅ CRITICAL: Ignore TOKEN_REFRESHED events - don't reload data!
      if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 [App] Token refreshed - keeping current data');
        return;
      }

      // Initialize on first load (if not already initialized by INITIAL_SESSION)
      if (!isInitialized) {
        isInitialized = true;
        
        if (currentUserId && hasEmail) {
          console.log('✅ [App] First load - authenticated user detected');
          await initializeAuthenticatedData();
        }
        
        previousUserId = currentUserId;
        return;
      }

      // Handle user ID changes (login/logout)
      if (currentUserId !== previousUserId) {
        previousUserId = currentUserId;

        if (currentUserId && hasEmail) {
          console.log('✅ [App] User logged in - loading data');
          await initializeAuthenticatedData();
        } else {
          console.log('👋 [App] User logged out');
        }
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [setActiveChallenge, setPausedChallenges, setUserTier, setDailyStepGoal, setUserProfile, setIsAppReady]); // ✅ REMOVED userProfile - fixes infinite loop!

  // ✅ FAILSAFE: Force unlock app after 5 seconds if it gets stuck
  useEffect(() => {
    if (!isAppReady) {
      const timer = setTimeout(() => {
        console.warn('⚠️ [App] Force unlocking app after 5s timeout');
        setIsAppReady(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isAppReady, setIsAppReady]);

  // ✅ CRITICAL: Show loading screen until app is ready
  // This prevents child components (like TeamScreen) from making API calls
  // before auth session is fully verified and restored.
  if (!isAppReady) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${theme === 'dark' ? 'bg-[#0B101B] text-white' : 'bg-white text-gray-900'}`}>
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-sm opacity-50">Initializing...</p>
      </div>
    );
  }

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
