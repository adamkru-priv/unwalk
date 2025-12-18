import { BottomNavigation } from '../common/BottomNavigation';
import { AppHeader } from '../common/AppHeader';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { useState, useEffect } from 'react';
import { authService } from '../../lib/auth';
import { AccountSection } from './AccountSection';
import { AccountTypeCards } from './AccountTypeCards';
import { AuthModal } from './AuthModal';
import { ThemeSelector } from './ThemeSelector';
import { DailyStepGoalSection } from './DailyStepGoalSection';
import { PausedChallengesWarning } from './PausedChallengesWarning';
import { APP_VERSION, BUILD_DATE } from '../../version';
import { useHealthKit } from '../../hooks/useHealthKit';

export function ProfileScreen() {
  const userTier = useChallengeStore((s) => s.userTier);
  const setUserTier = useChallengeStore((s) => s.setUserTier);
  const pausedChallenges = useChallengeStore((s) => s.pausedChallenges);
  const clearPausedChallenges = useChallengeStore((s) => s.clearPausedChallenges);
  const dailyStepGoal = useChallengeStore((s) => s.dailyStepGoal);
  const setDailyStepGoal = useChallengeStore((s) => s.setDailyStepGoal);
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);
  const setOnboardingComplete = useChallengeStore((s) => s.setOnboardingComplete);
  const theme = useChallengeStore((s) => s.theme);
  const setTheme = useChallengeStore((s) => s.setTheme);
  const resetToInitialState = useChallengeStore((s) => s.resetToInitialState);
  const userProfile = useChallengeStore((s) => s.userProfile); // ✅ Read from store
  const setUserProfile = useChallengeStore((s) => s.setUserProfile); // For updates
  const isHealthConnected = useChallengeStore((s) => s.isHealthConnected);

  const {
    isNative,
    isAvailable: healthKitAvailable,
    isAuthorized: healthKitAuthorized,
    isLoading: healthKitLoading,
    requestPermission: connectHealthKit,
    syncSteps: refreshHealthKitSteps,
    todaySteps,
  } = useHealthKit();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'email' | 'verify-otp'>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [showPausedWarning, setShowPausedWarning] = useState(false);

  // ✅ Sync local state when profile changes in store (no auth listener needed - App.tsx handles it)
  useEffect(() => {
    if (userProfile) {
      setUserTier(userProfile.tier);
      setDailyStepGoal(userProfile.daily_step_goal);
    }
  }, [userProfile, setUserTier, setDailyStepGoal]);

  const isGuest = userProfile?.is_guest || false;

  const handleSignOut = async () => {
    if (!confirm('Sign out from your account?')) return;
    
    try {
      console.log('🔓 [ProfileScreen] Signing out...');
      
      // 1. Clear store FIRST
      console.log('🧹 [ProfileScreen] Clearing store...');
      setUserProfile(null);
      resetToInitialState();
      
      // 2. Clear ALL localStorage (including Supabase auth cache)
      console.log('🧹 [ProfileScreen] Clearing localStorage...');
      localStorage.clear();
      
      // 3. Sign out from Supabase
      const { error } = await authService.signOut();
      if (error) {
        console.error('❌ Sign out error:', error);
        alert('Failed to sign out. Please try again.');
        return;
      }
      
      console.log('✅ [ProfileScreen] Supabase sign out successful');
      
      // 4. Small delay to ensure cleanup completes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 5. Hard reload to root
      console.log('🔄 [ProfileScreen] Reloading page...');
      window.location.href = '/';
    } catch (err) {
      console.error('❌ Unexpected error during sign out:', err);
      // W przypadku błędu - wyczyść wszystko i reload
      localStorage.clear();
      window.location.href = '/';
    }
  };

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setAuthLoading(true);

    try {
      if (!email) throw new Error('Please enter your email');

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) throw new Error('Please enter a valid email');

      const { error } = await authService.signInWithOTP(email);
      if (error) throw error;
      
      setAuthSuccess('🔢 Check your email! We sent you an 8-digit code.');
      setAuthMode('verify-otp');
    } catch (err: any) {
      setAuthError(err.message || 'Something went wrong');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (!otpCode || otpCode.length !== 8) throw new Error('Please enter the 8-digit code');

      const { session, error } = await authService.verifyOTP(email, otpCode);
      if (error) throw error;

      if (session) {
        console.log('✅ [Auth] OTP verified successfully');
        
        setAuthLoading(false);
        setAuthSuccess('✅ Welcome! Loading your data...');
        
        // ✅ FIX: Don't reload - let App.tsx handle data loading via onAuthStateChange
        setTimeout(() => {
          setShowAuthModal(false);
          // Removed: window.location.reload()
        }, 1000);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Invalid code. Please try again.');
      setAuthLoading(false);
    }
  };

  const handleBackFromAuth = () => {
    setAuthMode('email');
    setOtpCode('');
    setAuthError(null);
    setAuthSuccess(null);
  };

  const handleTierChange = async (tier: 'basic' | 'pro') => {
    if (isGuest && tier === 'pro') {
      alert('Sign in to upgrade to Pro');
      return;
    }

    if (userTier === 'pro' && tier === 'basic' && pausedChallenges.length > 0) {
      setShowPausedWarning(true);
      return;
    }

    setUserTier(tier);

    try {
      const { error } = await authService.updateProfile({ tier });
      if (error) {
        console.error('Failed to update tier:', error);
        alert('Failed to update account type. Please try again.');
        setUserTier(userProfile?.tier || 'basic'); // Rollback on error
        return;
      }
      
      // ✅ Update userProfile in store to persist the change
      if (userProfile) {
        setUserProfile({
          ...userProfile,
          tier
        });
      }
      
      console.log('✅ Tier updated in database and store:', tier);
    } catch (err) {
      console.error('Failed to update tier:', err);
      alert('Failed to update account type. Please try again.');
      setUserTier(userProfile?.tier || 'basic'); // Rollback on error
    }
  };

  const handleConfirmDowngrade = async () => {
    clearPausedChallenges();
    setUserTier('basic');

    try {
      const { error } = await authService.updateProfile({ tier: 'basic' });
      if (error) {
        console.error('Failed to downgrade tier:', error);
        return;
      }
      
      // ✅ Update userProfile in store
      if (userProfile) {
        setUserProfile({
          ...userProfile,
          tier: 'basic'
        });
      }
      
      console.log('✅ Downgraded to basic in database and store');
    } catch (err) {
      console.error('Failed to downgrade tier:', err);
    }

    setShowPausedWarning(false);
  };

  const handleDeleteAccount = async () => {
    const confirmText = 'Are you sure you want to delete your account?\n\n' +
      '⚠️ This will permanently delete:\n' +
      '• Your profile and progress\n' +
      '• All your challenges\n' +
      '• Team connections\n' +
      '• Badges and points\n\n' +
      'This action CANNOT be undone.';
    
    if (!confirm(confirmText)) return;
    if (!confirm('Last chance! Delete your account forever?')) return;

    try {
      const { error } = await authService.deleteAccount();
      
      if (error) {
        alert('Failed to delete account. Please try again or contact support.');
        console.error('Delete account error:', error);
        return;
      }

      alert('Your account has been deleted. All your data has been permanently removed.');
      resetToInitialState();
      window.location.reload();
    } catch (err) {
      alert('Something went wrong. Please try again.');
      console.error('Delete account error:', err);
    }
  };

  const handleSignInWithApple = async () => {
    try {
      const { error } = await authService.signInWithApple();
      if (error) {
        alert(error.message);
      }
    } catch (e: any) {
      alert(e?.message || 'Apple sign-in failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B101B] text-gray-900 dark:text-white pb-20 font-sans">
      <AppHeader showBackButton={true} />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        authMode={authMode}
        email={email}
        otpCode={otpCode}
        authLoading={authLoading}
        authError={authError}
        authSuccess={authSuccess}
        onEmailChange={setEmail}
        onOtpChange={setOtpCode}
        onSubmitEmail={handleSubmitEmail}
        onVerifyOTP={handleVerifyOTP}
        onBack={handleBackFromAuth}
      />

      <PausedChallengesWarning
        isOpen={showPausedWarning}
        pausedChallenges={pausedChallenges}
        onConfirm={handleConfirmDowngrade}
        onCancel={() => setShowPausedWarning(false)}
      />

      <main className="px-5 py-6 max-w-md mx-auto space-y-4">
        <AccountSection
          userProfile={userProfile}
          isGuest={isGuest}
          onSignOut={handleSignOut}
          onShowAuthModal={() => setShowAuthModal(true)}
        />

        {/* Apple auth/link */}
        {isGuest ? (
          <button
            onClick={handleSignInWithApple}
            className="w-full bg-black text-white rounded-2xl p-4 shadow-sm border border-black/10 transition-colors text-left flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-lg"></span>
              </div>
              <div>
                <div className="text-sm font-semibold">Continue with Apple</div>
                <div className="text-xs text-white/70">Create / sign in with Apple ID</div>
              </div>
            </div>
            <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : null}

        <AccountTypeCards
          isGuest={isGuest}
          userTier={userTier}
          onTierChange={handleTierChange}
          onShowAuthModal={() => setShowAuthModal(true)}
        />

        <ThemeSelector
          theme={theme}
          onThemeChange={setTheme}
        />

        {!isGuest && (
          <DailyStepGoalSection
            dailyStepGoal={dailyStepGoal}
            onSave={setDailyStepGoal}
          />
        )}

        {/* Apple Health status */}
        <div className="w-full bg-white dark:bg-[#151A25] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-white/5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Apple Health</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Status:{' '}
                {isNative && healthKitAvailable
                  ? isHealthConnected
                    ? 'Connected'
                    : 'Not connected'
                  : 'Unavailable'}
              </div>
              {isNative && healthKitAvailable && isHealthConnected && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Today: {todaySteps.toLocaleString()} steps
                </div>
              )}
            </div>

            {isNative && healthKitAvailable && (
              <button
                disabled={healthKitLoading}
                onClick={async () => {
                  const ok = await connectHealthKit();
                  if (ok) await refreshHealthKitSteps();
                }}
                className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold"
              >
                {healthKitAuthorized ? 'Refresh' : 'Connect'}
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            setOnboardingComplete(false);
            setCurrentScreen('onboarding');
          }}
          className="w-full bg-white dark:bg-[#151A25] hover:bg-gray-50 dark:hover:bg-[#1a1f2e] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-white/5 transition-colors text-left flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <span className="text-lg">ℹ️</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">View Tutorial</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">See how Movee works</div>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Footer Links - Small text at bottom */}
        <div className="pt-8 pb-4 flex flex-col items-center gap-3">
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-white/40">
            <button
              onClick={() => window.open('https://movee.app/privacy', '_blank')}
              className="hover:text-gray-700 dark:hover:text-white/60 transition-colors underline"
            >
              Privacy Policy
            </button>
            <span>•</span>
            <button
              onClick={() => window.open('https://movee.app/terms', '_blank')}
              className="hover:text-gray-700 dark:hover:text-white/60 transition-colors underline"
            >
              Terms of Service
            </button>
          </div>
          
          {!isGuest && (
            <button
              onClick={handleDeleteAccount}
              className="text-xs text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors underline"
            >
              Delete Account
            </button>
          )}
          
          <div className="text-xs text-gray-400 dark:text-white/30">
            Movee v{APP_VERSION} • {BUILD_DATE}
          </div>
        </div>
      </main>

      <BottomNavigation currentScreen="home" />
    </div>
  );
}
