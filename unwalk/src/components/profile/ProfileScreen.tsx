import { BottomNavigation } from '../common/BottomNavigation';
import { AppHeader } from '../common/AppHeader';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { useState, useEffect } from 'react';
import { authService } from '../../lib/auth';
import { AccountSection } from './AccountSection';
import { AuthModal } from './AuthModal';
import { PausedChallengesWarning } from './PausedChallengesWarning';
import { ProfileSettingsTab } from './ProfileSettingsTab';
import { ProfileBadgesTab } from './ProfileBadgesTab';
import { ProfileHistoryTab } from './ProfileHistoryTab';
import { APP_VERSION } from '../../version';
import { Capacitor } from '@capacitor/core';
import { checkPushNotificationStatus, initIosPushNotifications } from '../../lib/push/iosPush';
import { useHealthKit } from '../../hooks/useHealthKit'; // 🎯 NEW: Import useHealthKit

export function ProfileScreen() {
  const setUserTier = useChallengeStore((s) => s.setUserTier);
  const pausedChallenges = useChallengeStore((s) => s.pausedChallenges);
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);
  const setOnboardingComplete = useChallengeStore((s) => s.setOnboardingComplete);
  const theme = useChallengeStore((s) => s.theme);
  const setTheme = useChallengeStore((s) => s.setTheme);
  const resetToInitialState = useChallengeStore((s) => s.resetToInitialState);
  const userProfile = useChallengeStore((s) => s.userProfile);
  const setUserProfile = useChallengeStore((s) => s.setUserProfile);
  const dailyStepGoal = useChallengeStore((s) => s.dailyStepGoal);
  const setDailyStepGoal = useChallengeStore((s) => s.setDailyStepGoal);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'email' | 'verify-otp'>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [showPausedWarning, setShowPausedWarning] = useState(false);

  const [pushEnabled, setPushEnabled] = useState<boolean>(true);
  const [pushSaving, setPushSaving] = useState(false);
  const [dailyGoalSaving, setDailyGoalSaving] = useState(false);

  const [pushNotifStatus, setPushNotifStatus] = useState({
    isAvailable: false,
    isGranted: false,
    isDenied: false,
    isPrompt: false,
  });
  const [pushNotifLoading, setPushNotifLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'settings' | 'badges' | 'history'>('settings');

  const isNative = Capacitor.isNativePlatform();

  // 🎯 NEW: Add HealthKit hook to recheck authorization
  const { recheckAuthorization } = useHealthKit();

  // 🎯 NEW: Recheck authorization when Settings tab becomes visible
  useEffect(() => {
    if (activeTab === 'settings' && isNative) {
      recheckAuthorization();
    }
  }, [activeTab, isNative, recheckAuthorization]);

  // ✅ Nasłuchuj na zdarzenie z AppHeader aby otworzyć zakładkę Badges
  useEffect(() => {
    const handleOpenBadgesTab = () => {
      setActiveTab('badges');
    };

    window.addEventListener('openBadgesTab', handleOpenBadgesTab);

    return () => {
      window.removeEventListener('openBadgesTab', handleOpenBadgesTab);
    };
  }, []);

  useEffect(() => {
    if (isNative) {
      checkPushNotificationStatus().then(setPushNotifStatus);
    }
  }, [isNative]);

  useEffect(() => {
    if (userProfile) {
      setUserTier('pro');
      setPushEnabled(userProfile.push_enabled ?? true);
    }
  }, [userProfile, setUserTier]);

  const handleSignOut = async () => {
    if (!confirm('Sign out from your account?')) return;

    try {
      const { error } = await authService.signOut();
      if (error) {
        alert('Failed to sign out. Please try again.');
        return;
      }

      setUserProfile(null);
      resetToInitialState();

      try {
        if (Capacitor.isNativePlatform()) {
          window.location.href = '/';
        } else {
          setOnboardingComplete(false);
          setCurrentScreen('home');
        }
      } catch {
        setOnboardingComplete(false);
        setCurrentScreen('home');
      }
    } catch (err) {
      console.error('Sign out error:', err);
      setUserProfile(null);
      resetToInitialState();
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

      setAuthSuccess('Check your email. We sent you a 6-digit code.');
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
      if (!otpCode || otpCode.length !== 6) throw new Error('Please enter the 6-digit code');

      const { session, error } = await authService.verifyOTP(email, otpCode);
      if (error) throw error;

      if (session) {
        setAuthSuccess('✅ Welcome! Loading your data...');
        setTimeout(() => setShowAuthModal(false), 800);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Invalid code. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleBackFromAuth = () => {
    setAuthMode('email');
    setOtpCode('');
    setAuthError(null);
    setAuthSuccess(null);
  };

  const handleDeleteAccount = async () => {
    const confirmText =
      'Are you sure you want to delete your account?\n\n' +
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
        return;
      }

      alert('Your account has been deleted. All your data has been permanently removed.');
      resetToInitialState();
      window.location.reload();
    } catch (err) {
      alert('Something went wrong. Please try again.');
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

  const handleDailyStepGoalChange = async (newGoal: number) => {
    if (!userProfile) return;

    const oldGoal = dailyStepGoal;
    setDailyStepGoal(newGoal);
    setDailyGoalSaving(true);

    try {
      const { error } = await authService.updateProfile({ daily_step_goal: newGoal } as any);
      if (error) throw error;

      setUserProfile({ ...userProfile, daily_step_goal: newGoal } as any);
    } catch (e) {
      setDailyStepGoal(oldGoal);
      alert('Failed to update daily step goal. Please try again.');
    } finally {
      setDailyGoalSaving(false);
    }
  };

  const handleEnablePushNotifications = async () => {
    if (pushNotifStatus.isDenied) {
      alert('Notifications are blocked. Please enable them in your device Settings app.');
      return;
    }

    setPushNotifLoading(true);
    try {
      await initIosPushNotifications();
      const newStatus = await checkPushNotificationStatus();
      setPushNotifStatus(newStatus);
      
      // ✅ FIX: Broadcast event to AppHeader that push status changed
      window.dispatchEvent(new CustomEvent('pushNotificationStatusChanged', { 
        detail: newStatus 
      }));
    } catch (e) {
      alert('Failed to enable notifications. Please try again.');
    } finally {
      setPushNotifLoading(false);
    }
  };

  const handleTogglePushEnabled = async (next: boolean) => {
    if (!userProfile) return;

    setPushEnabled(next);
    setPushSaving(true);

    try {
      const { error } = await authService.updateProfile({ push_enabled: next } as any);
      if (error) throw error;

      setUserProfile({ ...userProfile, push_enabled: next });
    } catch (e) {
      setPushEnabled(userProfile.push_enabled ?? true);
      alert('Failed to update notification settings. Please try again.');
    } finally {
      setPushSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B101B] text-gray-900 dark:text-white pb-20 font-sans">
      <AppHeader />

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
        onConfirm={() => setShowPausedWarning(false)}
        onCancel={() => setShowPausedWarning(false)}
      />

      <main className="px-4 py-6 max-w-2xl mx-auto">
        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex gap-2 bg-white dark:bg-[#151A25] rounded-2xl p-1 shadow-sm border border-gray-100 dark:border-white/5">
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Settings
            </button>
            <button
              onClick={() => setActiveTab('badges')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'badges'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Badges
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              History
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'settings' && (
          <>
            <div className="bg-white dark:bg-[#151A25] rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden mb-6">
              <AccountSection
                userProfile={userProfile}
                isGuest={false}
                onSignOut={handleSignOut}
                onEmailSignIn={() => setShowAuthModal(true)}
                onAppleSignIn={handleSignInWithApple}
                onGoogleSignIn={undefined}
              />
            </div>

            <ProfileSettingsTab
              userProfile={userProfile}
              theme={theme}
              onThemeChange={setTheme}
              pushEnabled={pushEnabled}
              onTogglePushEnabled={handleTogglePushEnabled}
              pushSaving={pushSaving}
              dailyStepGoal={dailyStepGoal}
              onDailyStepGoalChange={handleDailyStepGoalChange}
              dailyGoalSaving={dailyGoalSaving}
              pushNotifStatus={pushNotifStatus}
              onEnablePushNotifications={handleEnablePushNotifications}
              pushNotifLoading={pushNotifLoading}
            />
          </>
        )}

        {activeTab === 'badges' && (
          <ProfileBadgesTab userId={userProfile?.id} isGuest={userProfile?.is_guest || false} />
        )}

        {activeTab === 'history' && (
          <ProfileHistoryTab isGuest={userProfile?.is_guest || false} />
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-white/5 flex flex-col items-center gap-3">
          <div className="flex items-center gap-3 text-[13px] text-gray-500 dark:text-gray-400">
            <button
              onClick={() => window.open('https://movee.app/privacy', '_blank')}
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Privacy
            </button>
            <span>•</span>
            <button
              onClick={() => window.open('https://movee.app/terms', '_blank')}
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Terms
            </button>
          </div>

          <button
            onClick={handleDeleteAccount}
            className="text-[13px] text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
          >
            Delete Account
          </button>

          <div className="text-[12px] text-gray-400 dark:text-gray-500">
            MOVEE v{APP_VERSION}
          </div>
        </div>
      </main>

      <BottomNavigation currentScreen="profile" />
    </div>
  );
}
