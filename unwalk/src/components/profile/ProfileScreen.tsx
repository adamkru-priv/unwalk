import { BottomNavigation } from '../common/BottomNavigation';
import { AppHeader } from '../common/AppHeader';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { useState, useEffect } from 'react';
import { authService } from '../../lib/auth';
import { AccountSection } from './AccountSection';
import { AuthModal } from './AuthModal';
import { ThemeSelector } from './ThemeSelector';
import { PausedChallengesWarning } from './PausedChallengesWarning';
import { APP_VERSION } from '../../version';
import { useHealthKit } from '../../hooks/useHealthKit';
import { Capacitor } from '@capacitor/core';
import { checkPushNotificationStatus, initIosPushNotifications } from '../../lib/push/iosPush';

export function ProfileScreen() {
  const setUserTier = useChallengeStore((s) => s.setUserTier);
  const pausedChallenges = useChallengeStore((s) => s.pausedChallenges);
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);
  const setOnboardingComplete = useChallengeStore((s) => s.setOnboardingComplete); // 🎯 RESTORED: Needed for sign out flow
  const theme = useChallengeStore((s) => s.theme);
  const setTheme = useChallengeStore((s) => s.setTheme);
  const resetToInitialState = useChallengeStore((s) => s.resetToInitialState);
  const userProfile = useChallengeStore((s) => s.userProfile); // ✅ Read from store
  const setUserProfile = useChallengeStore((s) => s.setUserProfile); // For updates
  const isHealthConnected = useChallengeStore((s) => s.isHealthConnected);

  // 🎯 Determine health service name based on platform
  const platform = Capacitor.getPlatform();
  const healthServiceName = platform === 'ios' ? 'Apple Health' : platform === 'android' ? 'Health Connect' : 'Health Data';

  const {
    isNative,
    isAvailable: healthKitAvailable,
    isAuthorized: healthKitAuthorized,
    isLoading: healthKitLoading,
    requestPermission: connectHealthKit,
    syncSteps: refreshHealthKitSteps,
    todaySteps,
  } = useHealthKit();

  // 🔍 DEBUG: Log health kit status on Android
  useEffect(() => {
    console.log('🔍 [ProfileScreen] Health Kit Status:', {
      platform: Capacitor.getPlatform(),
      isNative,
      healthKitAvailable,
      healthKitAuthorized,
      isHealthConnected,
      healthKitLoading,
    });
  }, [isNative, healthKitAvailable, healthKitAuthorized, isHealthConnected, healthKitLoading]);

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
  const [dailyGoalSaving, setDailyGoalSaving] = useState(false); // 🎯 NEW
  const dailyStepGoal = useChallengeStore((s) => s.dailyStepGoal); // 🎯 NEW
  const setDailyStepGoal = useChallengeStore((s) => s.setDailyStepGoal); // 🎯 NEW

  // 🎯 NEW: Nickname editing state
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameValue, setNicknameValue] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);

  // ✅ NEW: Push notification status
  const [pushNotifStatus, setPushNotifStatus] = useState({
    isAvailable: false,
    isGranted: false,
    isDenied: false,
    isPrompt: false,
  });
  const [pushNotifLoading, setPushNotifLoading] = useState(false);

  // Check push notification status on mount (for native only)
  useEffect(() => {
    if (isNative) {
      checkPushNotificationStatus().then(setPushNotifStatus);
    }
  }, [isNative]);

  useEffect(() => {
    if (userProfile) {
      setUserTier('pro');
    }
  }, [userProfile, setUserTier]);

  useEffect(() => {
    if (userProfile) {
      setPushEnabled(userProfile.push_enabled ?? true);
    }
  }, [userProfile]);

  const handleSignOut = async () => {
    if (!confirm('Sign out from your account?')) return;

    try {
      console.log('🔓 [ProfileScreen] Starting sign out...');

      const { error } = await authService.signOut();
      if (error) {
        console.error('❌ Sign out error:', error);
        alert('Failed to sign out. Please try again.');
        return;
      }

      console.log('✅ [ProfileScreen] Supabase sign out successful');

      console.log('🧹 [ProfileScreen] Clearing store...');
      setUserProfile(null);
      resetToInitialState();

      // ✅ FIX: Force full reload on iOS to ensure UI updates properly
      console.log('🔄 [ProfileScreen] Forcing full app reload...');
      
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          // Native: Reload the entire WebView
          window.location.href = '/';
        } else {
          // Web: Navigate to landing page
          setOnboardingComplete(false);
          setCurrentScreen('home');
          
          if (typeof window !== 'undefined' && window.location.pathname === '/') {
            window.history.replaceState({}, '', '/app');
          }
        }
      } catch {
        // Fallback
        setOnboardingComplete(false);
        setCurrentScreen('home');
      }

      console.log('✅ [ProfileScreen] Sign out complete!');
    } catch (err) {
      console.error('❌ Unexpected error during sign out:', err);

      // Nuclear option: clear everything and force reload
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          const { Preferences } = await import('@capacitor/preferences');
          await Preferences.clear();
        } else {
          localStorage.clear();
        }
      } catch {
        // ignore
      }

      setUserProfile(null);
      resetToInitialState();
      
      // Force reload
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
        setTimeout(() => {
          setShowAuthModal(false);
        }, 800);
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
      console.log('🔔 [Profile] User clicked Enable Notifications');
      await initIosPushNotifications();
      
      // Re-check status after initialization
      const newStatus = await checkPushNotificationStatus();
      setPushNotifStatus(newStatus);
      
      if (newStatus.isGranted) {
        console.log('✅ [Profile] Push notifications enabled successfully');
      }
    } catch (e) {
      console.error('❌ [Profile] Failed to enable push notifications:', e);
      alert('Failed to enable notifications. Please try again.');
    } finally {
      setPushNotifLoading(false);
    }
  };

  // 🎯 NEW: Handle nickname save
  const handleSaveNickname = async () => {
    if (!userProfile) return;

    // Validate nickname (max 9 chars)
    if (nicknameValue.length > 9) {
      alert('Nickname must be 9 characters or less');
      return;
    }

    setNicknameSaving(true);

    try {
      const { error } = await authService.updateProfile({ nickname: nicknameValue || null } as any);
      if (error) throw error;

      setUserProfile({ ...userProfile, nickname: nicknameValue || null });
      setIsEditingNickname(false);
    } catch (e) {
      alert('Failed to update nickname. Please try again.');
    } finally {
      setNicknameSaving(false);
    }
  };

  // 🎯 NEW: Handle start editing nickname
  const handleEditNickname = () => {
    setNicknameValue(userProfile?.nickname || '');
    setIsEditingNickname(true);
  };

  // 🎯 NEW: Handle cancel editing nickname
  const handleCancelNickname = () => {
    setIsEditingNickname(false);
    setNicknameValue('');
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
        {/* Account Card */}
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

        {/* Settings List */}
        <div className="space-y-3">
          {/* 🎯 NEW: Nickname Editor */}
          <div className="bg-white dark:bg-[#151A25] rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 dark:border-white/5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[15px] font-medium text-gray-900 dark:text-white">Display Nickname</div>
                <div className="text-[13px] text-gray-500 dark:text-gray-400">
                  {userProfile?.nickname || 'Not set'}
                </div>
              </div>

              {!isEditingNickname && (
                <button
                  onClick={handleEditNickname}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium transition-colors"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditingNickname && (
              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  value={nicknameValue}
                  onChange={(e) => setNicknameValue(e.target.value.slice(0, 9))}
                  placeholder="Enter nickname (max 9 chars)"
                  maxLength={9}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B101B] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {nicknameValue.length}/9 characters
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelNickname}
                      disabled={nicknameSaving}
                      className="px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/15 text-gray-700 dark:text-gray-300 text-[13px] font-medium transition-colors disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveNickname}
                      disabled={nicknameSaving}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium transition-colors disabled:opacity-60"
                    >
                      {nicknameSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 🎯 REMOVED: Challenge History - moved to BadgesScreen */}

          {/* My Custom Challenges */}
          <button
            onClick={() => setCurrentScreen('customChallenge')}
            className="w-full bg-white dark:bg-[#151A25] rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 transition-colors text-left flex items-center justify-between group"
          >
            <div>
              <div className="text-[15px] font-medium text-gray-900 dark:text-white">My Custom Challenges</div>
              <div className="text-[13px] text-gray-500 dark:text-gray-400">Create & manage</div>
            </div>
          </button>

          {/* Health Data Integration (HealthKit on iOS, Health Connect on Android) */}
          <div className="bg-white dark:bg-[#151A25] rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 dark:border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-medium text-gray-900 dark:text-white">
                  {healthServiceName}
                </div>
                <div className="text-[13px] text-gray-500 dark:text-gray-400">
                  {isNative && healthKitAvailable
                    ? isHealthConnected
                      ? `${todaySteps.toLocaleString()} steps today`
                      : 'Not connected'
                    : 'Unavailable'}
                </div>
              </div>

              {isNative && healthKitAvailable && (
                <button
                  disabled={healthKitLoading}
                  onClick={async () => {
                    console.log('🔵 [Profile] Connect/Sync button clicked');
                    const ok = await connectHealthKit();
                    console.log('🔵 [Profile] connectHealthKit result:', ok);
                    if (ok) {
                      await refreshHealthKitSteps();
                      console.log('🔵 [Profile] Steps synced');
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-[13px] font-medium transition-colors"
                >
                  {healthKitAuthorized ? 'Sync' : 'Connect'}
                </button>
              )}
            </div>
          </div>

          {/* ✅ NEW: Push Notifications Permission (show only if not granted yet) */}
          {isNative && pushNotifStatus.isAvailable && !pushNotifStatus.isGranted && (
            <div className="bg-white dark:bg-[#151A25] rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 dark:border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium text-gray-900 dark:text-white">
                    Push Notifications
                  </div>
                  <div className="text-[13px] text-gray-500 dark:text-gray-400">
                    {pushNotifStatus.isDenied 
                      ? 'Blocked - check Settings' 
                      : 'Get notified about challenges'}
                  </div>
                </div>

                <button
                  disabled={pushNotifLoading || pushNotifStatus.isDenied}
                  onClick={handleEnablePushNotifications}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-[13px] font-medium transition-colors"
                >
                  {pushNotifLoading ? 'Enabling...' : 'Enable'}
                </button>
              </div>
            </div>
          )}

          {/* Daily Step Goal */}
          <div className="bg-white dark:bg-[#151A25] rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 dark:border-white/5">
            <div className="mb-3">
              <div className="text-[15px] font-medium text-gray-900 dark:text-white">Daily Step Goal</div>
              <div className="text-[13px] text-gray-500 dark:text-gray-400">
                {dailyStepGoal.toLocaleString()} steps
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[5000, 8000, 10000, 12000, 15000].map((goal) => (
                <button
                  key={goal}
                  disabled={dailyGoalSaving}
                  onClick={() => handleDailyStepGoalChange(goal)}
                  className={`py-2 rounded-lg text-[13px] font-medium transition-all ${
                    dailyStepGoal === goal
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15'
                  } ${dailyGoalSaving ? 'opacity-60' : ''}`}
                >
                  {goal >= 1000 ? `${goal / 1000}k` : goal}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white dark:bg-[#151A25] rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 dark:border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[15px] font-medium text-gray-900 dark:text-white">Notifications</div>
                <div className="text-[13px] text-gray-500 dark:text-gray-400">
                  {pushEnabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>

              <button
                type="button"
                disabled={pushSaving}
                onClick={() => handleTogglePushEnabled(!pushEnabled)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  pushEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'
                } ${pushSaving ? 'opacity-60' : ''}`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-sm ${
                    pushEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Theme Selector - Simple Icon Only */}
          <div className="bg-white dark:bg-[#151A25] rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 dark:border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[15px] font-medium text-gray-900 dark:text-white">Appearance</div>
                <div className="text-[13px] text-gray-500 dark:text-gray-400 capitalize">{theme}</div>
              </div>
              <ThemeSelector theme={theme} onThemeChange={setTheme} />
            </div>
          </div>

          {/* 🎯 REMOVED: Start Screen button - onboarding screen no longer needed */}
        </div>

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
            Movee v{APP_VERSION}
          </div>
        </div>
      </main>

      <BottomNavigation currentScreen="home" />
    </div>
  );
}
