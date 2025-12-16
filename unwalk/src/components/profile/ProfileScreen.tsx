import { BottomNavigation } from '../common/BottomNavigation';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { useState, useEffect } from 'react';
import { authService, type UserProfile } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { AccountSection } from './AccountSection';
import { AccountTypeCards } from './AccountTypeCards';
import { AuthModal } from './AuthModal';
import { ThemeSelector } from './ThemeSelector';
import { DailyStepGoalSection } from './DailyStepGoalSection';
import { PausedChallengesWarning } from './PausedChallengesWarning';

export function ProfileScreen() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'email' | 'verify-otp'>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [showPausedWarning, setShowPausedWarning] = useState(false);

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

  useEffect(() => {
    loadUserProfile();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 [ProfileScreen] Auth state changed:', event, 'session:', session?.user?.id);
      
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        console.log('🔄 [ProfileScreen] Auth event detected, waiting for App.tsx to update...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('🔄 [ProfileScreen] Now reloading profile...');
        await loadUserProfile();
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async () => {
    try {
      console.log('🔍 [ProfileScreen] Loading user profile...');
      const profile = await authService.getUserProfile();
      
      console.log('🔍 [ProfileScreen] User profile loaded:', profile);
      console.log('🔍 [ProfileScreen] Is guest?', profile?.is_guest);
      console.log('🔍 [ProfileScreen] Email:', profile?.email);
      console.log('🔍 [ProfileScreen] Tier:', profile?.tier);
      
      setUserProfile(profile);
      
      if (profile && !profile.is_guest) {
        console.log('✅ [ProfileScreen] Updating store with authenticated user data');
        setUserTier(profile.tier);
        setDailyStepGoal(profile.daily_step_goal);
      } else if (profile && profile.is_guest) {
        console.log('👤 [ProfileScreen] User is guest, keeping guest tier');
      }
    } catch (error) {
      console.error('❌ [ProfileScreen] Failed to load profile:', error);
    }
  };

  const isGuest = userProfile?.is_guest || false;

  const handleSignOut = async () => {
    if (!confirm('Sign out from your account?')) return;
    
    const { error } = await authService.signOut();
    if (!error) {
      setUserProfile(null);
      resetToInitialState();
      window.location.reload();
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
        return;
      }
      console.log('✅ Tier updated in database:', tier);
    } catch (err) {
      console.error('Failed to update tier:', err);
      alert('Failed to update account type. Please try again.');
    }
  };

  const handleConfirmDowngrade = async () => {
    clearPausedChallenges();
    setUserTier('basic');

    try {
      const { error } = await authService.updateProfile({ tier: 'basic' });
      if (error) {
        console.error('Failed to downgrade tier:', error);
      }
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B101B] text-gray-900 dark:text-white pb-20 font-sans">
      <div className="bg-gray-50/80 dark:bg-[#0B101B]/80 backdrop-blur-md sticky top-0 z-20 px-6 py-4 border-b border-gray-200 dark:border-white/10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <button
            onClick={() => setCurrentScreen('home')}
            className="text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white transition-colors p-1"
            aria-label="Close settings"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

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

        {!isGuest && (
          <button
            onClick={handleDeleteAccount}
            className="w-full bg-white dark:bg-[#151A25] hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-white/5 hover:border-red-300 dark:hover:border-red-800 transition-colors text-left flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300">Delete Account</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Permanently delete all your data</div>
              </div>
            </div>
            <svg className="w-5 h-5 text-red-400 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </main>

      <BottomNavigation currentScreen="home" />
    </div>
  );
}
