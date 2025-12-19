import { useState } from 'react';
import { motion } from 'framer-motion';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { authService } from '../../lib/auth';

const slide = {
  image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80',
};

export function OnboardingScreen() {
  const setOnboardingComplete = useChallengeStore((s) => s.setOnboardingComplete);

  const [authMode, setAuthMode] = useState<'email' | 'verify-otp'>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  const handleContinueAsGuest = () => {
    setOnboardingComplete(true);

    const userProfile = useChallengeStore.getState().userProfile;
    if (!userProfile || userProfile.is_guest) {
      console.log('🔄 [Onboarding] Guest user - reloading page for clean state...');
      setTimeout(() => window.location.reload(), 100);
    } else {
      useChallengeStore.setState({ currentScreen: 'whoToChallenge' });
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

      setAuthSuccess('Check your email — we sent you an 8-digit code.');
      setAuthMode('verify-otp');
    } catch (err: any) {
      setAuthError(err?.message || 'Something went wrong');
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
        setAuthSuccess('Welcome! Loading your data...');
        setTimeout(() => {
          // App.tsx auth listener takes over.
          useChallengeStore.setState({ currentScreen: 'whoToChallenge' });
        }, 600);
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Invalid code. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleBack = () => {
    setAuthMode('email');
    setOtpCode('');
    setAuthError(null);
    setAuthSuccess(null);
  };

  const handleAppleSignIn = async () => {
    setAuthError(null);
    try {
      const { error } = await authService.signInWithApple();
      if (error) throw error;
      // flow continues via redirect/auth listener
    } catch (e: any) {
      setAuthError(e?.message || 'Apple sign-in failed');
    }
  };

  return (
    <div className="h-[100dvh] bg-gradient-to-b from-[#0B101B] to-[#151A25] flex flex-col relative overflow-hidden pt-safe">
      {/* Image top */}
      <div className="relative h-[48vh] overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0B101B] z-10" />
        <motion.img
          src={slide.image}
          alt="MOVEE"
          className="w-full h-full object-cover"
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6 }}
        />

        {/* subtle brand overlay */}
        <div className="absolute inset-0 z-20 flex items-end px-6 pb-6">
          <div>
            <div className="text-white/80 text-xs font-bold tracking-[0.25em]">MOVEE</div>
            <div className="text-white text-3xl font-black leading-tight drop-shadow-2xl">
              Walk more.
              <br />
              Unlock more.
            </div>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="flex-1 px-6 pt-6 pb-8 flex flex-col justify-between">
        <div>
          <div className="text-white/70 text-sm mb-3">
            Sign in to sync your progress, join teams and get notifications.
          </div>

          {authMode === 'email' && (
            <form onSubmit={handleSubmitEmail} className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-white/80 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                  disabled={authLoading}
                  autoFocus
                />
              </div>

              {authError && (
                <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-3 text-sm text-red-200">
                  {authError}
                </div>
              )}

              <motion.button
                type="submit"
                disabled={authLoading}
                className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-purple-500/30 transition-all disabled:opacity-60"
                whileTap={{ scale: 0.98 }}
              >
                {authLoading ? 'Sending...' : 'Sign in'}
              </motion.button>
            </form>
          )}

          {authMode === 'verify-otp' && (
            <form onSubmit={handleVerifyOTP} className="space-y-3">
              <button
                type="button"
                onClick={handleBack}
                className="text-white/70 hover:text-white text-sm font-bold"
              >
                ← Back
              </button>

              <div className="text-white/70 text-sm">
                Enter the 8-digit code sent to <span className="text-white font-semibold">{email}</span>
              </div>

              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="00000000"
                className="w-full px-4 py-4 rounded-2xl border border-white/10 bg-white/5 text-white text-center text-2xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                disabled={authLoading}
                autoFocus
                maxLength={8}
              />

              {authError && (
                <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-3 text-sm text-red-200">
                  {authError}
                </div>
              )}

              {authSuccess && (
                <div className="bg-green-900/20 border border-green-800/50 rounded-xl p-3 text-sm text-green-200">
                  {authSuccess}
                </div>
              )}

              <motion.button
                type="submit"
                disabled={authLoading || otpCode.length !== 8}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold text-lg transition-all disabled:opacity-60"
                whileTap={{ scale: 0.98 }}
              >
                {authLoading ? 'Verifying...' : 'Verify code'}
              </motion.button>
            </form>
          )}

          <div className="mt-4">
            <button
              type="button"
              onClick={handleAppleSignIn}
              className="w-full bg-black text-white rounded-2xl p-4 shadow-sm border border-black/10 transition-colors text-left flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="text-lg"></span>
                </div>
                <div>
                  <div className="text-sm font-semibold">Sign in with Apple</div>
                  <div className="text-xs text-white/70">Use your Apple ID</div>
                </div>
              </div>
              <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="text-center text-sm text-white/60">
          Prefer not to sign in?{' '}
          <button onClick={handleContinueAsGuest} className="underline font-semibold text-white/80 hover:text-white">
            Continue as guest
          </button>
        </div>
      </div>
    </div>
  );
}
