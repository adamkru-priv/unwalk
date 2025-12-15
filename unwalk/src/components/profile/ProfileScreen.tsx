import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { useState, useEffect } from 'react';
import { authService, type UserProfile } from '../../lib/auth';
import { getGuestDisplayName } from '../../lib/deviceId';

export function ProfileScreen() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'email' | 'verify-otp'>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

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
  
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showPausedWarning, setShowPausedWarning] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    const profile = await authService.getUserProfile();
    setUserProfile(profile);
    
    // Log for debugging
    console.log('🔍 [ProfileScreen] User profile:', profile);
    console.log('🔍 [ProfileScreen] Is guest?', profile?.is_guest);
  };

  // Check if user is a guest - MUST BE BEFORE useEffect that uses it
  const isGuest = userProfile?.is_guest || false;

  // Auto-scroll to current account type card
  useEffect(() => {
    if (userProfile === null) return;

    // Wait for DOM to render
    setTimeout(() => {
      const container = document.getElementById('account-type-scroll');
      if (!container) return;

      let targetCard: HTMLElement | null = null;
      
      if (isGuest) {
        targetCard = document.getElementById('guest-card');
      } else if (userTier === 'basic') {
        targetCard = document.getElementById('basic-card');
      } else if (userTier === 'pro') {
        targetCard = document.getElementById('pro-card');
      }

      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 100);
  }, [userProfile, userTier, isGuest]);

  const handleSignOut = async () => {
    if (!confirm('Sign out from your account?')) return;
    
    const { error } = await authService.signOut();
    if (!error) {
      setUserProfile(null);
      // Reset entire app state and go back to onboarding
      resetToInitialState();
      // Generate new guest ID
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
        // Convert guest to authenticated user
        console.log('🔄 [Auth] Converting guest to authenticated user...');
        const { error: convertError } = await authService.convertGuestToUser();
        if (convertError) {
          console.error('⚠️ [Auth] Convert guest error:', convertError);
          // Don't fail - user is still logged in
        } else {
          console.log('✅ [Auth] Guest successfully converted to user');
        }

        setAuthSuccess('✅ Welcome!');
        setTimeout(async () => {
          setShowAuthModal(false);
          await loadUserProfile();
          // Force refresh to update all state
          window.location.reload();
        }, 1000);
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

  const handleStartEdit = () => {
    setInputValue((dailyStepGoal || 10000).toString());
    setIsEditingGoal(true);
  };

  const handleSaveGoal = () => {
    const num = parseInt(inputValue.replace(/\D/g, ''));
    if (!isNaN(num) && num >= 1000) {
      setDailyStepGoal(num);
    }
    setIsEditingGoal(false);
    // TODO: Save to backend/localStorage
  };

  const handleCancelEdit = () => {
    setIsEditingGoal(false);
    setInputValue('');
  };

  const handleInputChange = (value: string) => {
    // Remove all non-digits
    const digitsOnly = value.replace(/\D/g, '');
    setInputValue(digitsOnly);
  };

  const formatWithCommas = (num: number) => {
    return num.toLocaleString('en-US');
  };

  const handleTierChange = async (tier: 'basic' | 'pro') => {
    // Guest can't go Pro
    if (isGuest && tier === 'pro') {
      alert('Sign in to upgrade to Pro');
      return;
    }

    // If changing from pro to basic and has paused challenges, show warning
    if (userTier === 'pro' && tier === 'basic' && pausedChallenges.length > 0) {
      setShowPausedWarning(true);
      return;
    }

    // Update in local store
    setUserTier(tier);

    // Save to database
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

    // Save to database
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

    // Double confirmation
    if (!confirm('Last chance! Delete your account forever?')) return;

    try {
      const { error } = await authService.deleteAccount();
      
      if (error) {
        alert('Failed to delete account. Please try again or contact support.');
        console.error('Delete account error:', error);
        return;
      }

      // Account deleted - redirect to onboarding
      alert('Your account has been deleted. All your data has been permanently removed.');
      resetToInitialState();
      window.location.reload();
    } catch (err) {
      alert('Something went wrong. Please try again.');
      console.error('Delete account error:', err);
    }
  };

  const displayGoal = dailyStepGoal || 10000;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B101B] text-gray-900 dark:text-white pb-20 font-sans">
      <AppHeader />

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5" onClick={() => setShowAuthModal(false)}>
          <div 
            className="bg-white dark:bg-[#151A25] rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {authMode === 'email' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Sign In</h2>
                  <button
                    onClick={() => setShowAuthModal(false)}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                  Sign in to sync your progress and enable team features
                </p>

                <form onSubmit={handleSubmitEmail} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-colors"
                      disabled={authLoading}
                      autoFocus
                    />
                  </div>

                  {authError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-600 dark:text-red-400">
                      {authError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                  >
                    {authLoading ? 'Sending...' : 'Continue'}
                  </button>
                </form>
              </>
            )}

            {authMode === 'verify-otp' && (
              <>
                <button
                  onClick={handleBackFromAuth}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-1 text-sm font-bold"
                >
                  ← Back
                </button>

                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Enter your code</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                  We sent an 8-digit code to <strong>{email}</strong>
                </p>

                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="00000000"
                    className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-2xl font-bold tracking-widest focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-colors"
                    disabled={authLoading}
                    autoFocus
                    maxLength={8}
                  />

                  {authError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-600 dark:text-red-400">
                      {authError}
                    </div>
                  )}

                  {authSuccess && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-sm text-green-600 dark:text-green-400">
                      {authSuccess}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authLoading || otpCode.length !== 8}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                  >
                    {authLoading ? 'Verifying...' : 'Verify Code'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Paused Challenges Warning Modal */}
      {showPausedWarning && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-5">
          <div className="bg-white dark:bg-[#151A25] border border-gray-200 dark:border-white/10 rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Paused Challenges</h2>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              You have <span className="font-bold text-gray-900 dark:text-white">{pausedChallenges.length} paused challenge{pausedChallenges.length !== 1 ? 's' : ''}</span>.
            </p>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Downgrading to Basic will <span className="font-bold text-orange-600 dark:text-orange-400">permanently delete</span> all paused challenges. This action cannot be undone.
            </p>

            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-lg p-3 mb-4">
              <div className="text-xs font-semibold text-orange-800 dark:text-orange-300 mb-2">Challenges to be deleted:</div>
              <div className="space-y-1">
                {pausedChallenges.slice(0, 3).map((challenge) => (
                  <div key={challenge.id} className="text-xs text-orange-700 dark:text-orange-400 flex items-center gap-1">
                    <span>•</span>
                    <span className="truncate">{challenge.admin_challenge?.title}</span>
                  </div>
                ))}
                {pausedChallenges.length > 3 && (
                  <div className="text-xs text-orange-700 dark:text-orange-400 italic">
                    +{pausedChallenges.length - 3} more...
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowPausedWarning(false)}
                className="flex-1 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors border border-gray-300 dark:border-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDowngrade}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                Delete & Downgrade
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="px-5 py-6 max-w-md mx-auto space-y-4">
        {/* Account Section */}
        <section className="bg-white dark:bg-[#151A25] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-white/5">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span>👤</span>
            <span>Account</span>
          </h2>
          
          {userProfile && !isGuest ? (
            // Logged in user - show only email and Sign Out button
            <div className="space-y-3">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {userProfile.email}
              </div>
              
              <button
                onClick={handleSignOut}
                className="w-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            // Guest user - show icon, display name, and Sign In button
            <div className="space-y-3">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {userProfile?.display_name || getGuestDisplayName()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Sign in to sync & unlock Pro features
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setShowAuthModal(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                Sign In
              </button>
            </div>
          )}
        </section>

        {/* Account Type - Horizontal Scrollable Cards */}
        <section className="bg-white dark:bg-[#151A25] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-white/5">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span>⭐</span>
            <span>Account Type</span>
          </h2>
          
          {/* Horizontal scroll container */}
          <div 
            id="account-type-scroll"
            className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory scrollbar-hide scroll-smooth"
          >
            {/* Guest Card */}
            <div 
              id="guest-card"
              className={`min-w-[280px] rounded-xl border-2 p-4 transition-all snap-center ${
                isGuest 
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 shadow-lg' 
                  : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Guest</h3>
                  {isGuest && (
                    <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      CURRENT
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 italic">Try it out</div>
              </div>
              
              <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-green-600 dark:text-green-400">✓</span>
                  <span>Browse 60+ challenges</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 dark:text-green-400">✓</span>
                  <span>Start solo challenges</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-500">✗</span>
                  <span className="text-gray-400 dark:text-gray-500">Progress sync</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-500">✗</span>
                  <span className="text-gray-400 dark:text-gray-500">Team features</span>
                </div>
              </div>

              {isGuest && (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all"
                >
                  Sign Up for Free →
                </button>
              )}
            </div>

            {/* Basic Card */}
            <div 
              id="basic-card"
              className={`min-w-[280px] rounded-xl border-2 p-4 transition-all snap-center ${
                !isGuest && userTier === 'basic' 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-500 shadow-lg' 
                  : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Basic</h3>
                  {!isGuest && userTier === 'basic' && (
                    <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      CURRENT
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-green-600 dark:text-green-400">FREE</div>
              </div>
              
              <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-green-600 dark:text-green-400">✓</span>
                  <span>Progress sync</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 dark:text-green-400">✓</span>
                  <span>Team features</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 dark:text-green-400">✓</span>
                  <span>Custom challenges</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-orange-500">⚠️</span>
                  <span>Contains ads</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-500">✗</span>
                  <span className="text-gray-400 dark:text-gray-500">Multiple challenges</span>
                </div>
              </div>

              {/* Show downgrade button if Pro user, sign up hint if guest, nothing if current Basic */}
              {!isGuest && userTier === 'pro' ? (
                <button
                  onClick={() => handleTierChange('basic')}
                  className="w-full bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                >
                  Downgrade to Basic
                </button>
              ) : isGuest ? (
                <div className="text-center text-xs text-gray-500 dark:text-gray-400 italic">
                  Sign up to unlock
                </div>
              ) : null}
            </div>

            {/* Pro Card */}
            <div 
              id="pro-card"
              className={`min-w-[280px] rounded-xl border-2 p-4 transition-all snap-center ${
                !isGuest && userTier === 'pro' 
                  ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-500 shadow-lg' 
                  : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Pro ⭐</h3>
                  {!isGuest && userTier === 'pro' && (
                    <span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      CURRENT
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-amber-600 dark:text-amber-400">$2.99/month</div>
              </div>
              
              <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-green-600 dark:text-green-400">✓</span>
                  <span>No Ads</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 dark:text-green-400">✓</span>
                  <span>Multiple challenges</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 dark:text-green-400">✓</span>
                  <span>Pause & resume</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 dark:text-green-400">✓</span>
                  <span>Badges & points</span>
                </div>
              </div>

              {/* Show upgrade button if Basic user, sign up hint if guest, nothing if current Pro */}
              {!isGuest && userTier === 'basic' ? (
                <button
                  onClick={() => handleTierChange('pro')}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all"
                >
                  Upgrade to Pro →
                </button>
              ) : isGuest ? (
                <div className="text-center text-xs text-gray-500 dark:text-gray-400 italic">
                  Sign up first
                </div>
              ) : null}
            </div>
          </div>

          {/* Scroll hint */}
          <div className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">
            ← Swipe to compare plans →
          </div>
        </section>

        {/* Theme Selector */}
        <section className="bg-white dark:bg-[#151A25] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎨</span>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Theme</h2>
            </div>
            
            {/* Toggle Switch */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className={`relative w-16 h-8 rounded-full transition-colors ${
                theme === 'dark' 
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600' 
                  : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform flex items-center justify-center ${
                  theme === 'dark' ? 'translate-x-9' : 'translate-x-1'
                }`}
              >
                {theme === 'dark' ? '🌙' : '☀️'}
              </div>
            </button>
          </div>
        </section>

        {/* Daily Step Goal - Only for logged in users */}
        {!isGuest && (
          <section className="bg-white dark:bg-[#151A25] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-white/5">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span>🎯</span>
              <span>Daily Step Goal</span>
            </h2>
            
            {isEditingGoal ? (
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className="w-full bg-gray-100 dark:bg-white/5 border-2 border-blue-500 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-lg font-bold text-center focus:outline-none"
                    placeholder="10000"
                    autoFocus
                  />
                  <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-1">steps per day</div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelEdit}
                    className="flex-1 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveGoal}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleStartEdit}
                className="w-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl p-4 transition-colors text-left"
              >
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatWithCommas(displayGoal)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">steps per day • tap to edit</div>
              </button>
            )}
          </section>
        )}

        {/* Quick Actions */}
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

        {/* Delete Account - Only for logged in users */}
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
