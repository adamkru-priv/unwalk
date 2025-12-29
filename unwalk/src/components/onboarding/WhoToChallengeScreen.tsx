import { useState } from 'react';
import { motion } from 'framer-motion';
import { authService } from '../../lib/auth';
import { useChallengeStore } from '../../stores/useChallengeStore';

export const WhoToChallengeScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'email' | 'verify-otp'>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);

  // Start as guest (Myself option) - deprecated, now requires login
  const handleGuestStart = () => {
    setShowEmailAuth(true);
  };

  // Apple Sign In
  const handleAppleSignIn = async () => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      const { error } = await authService.signInWithApple();
      
      if (error) {
        setAuthError(error.message);
        setIsLoading(false);
        return;
      }

      // Success - navigate to home
      setTimeout(() => {
        setCurrentScreen('home');
      }, 500);
    } catch (e: any) {
      setAuthError(e?.message || 'Apple sign-in failed');
      setIsLoading(false);
    }
  };

  // Email OTP - Step 1: Send code
  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setIsLoading(true);

    try {
      if (!email) throw new Error('Please enter your email');

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) throw new Error('Please enter a valid email');

      const { error } = await authService.signInWithOTP(email);
      if (error) throw error;

      setAuthSuccess('Check your email for the 6-digit code');
      setAuthMode('verify-otp');
    } catch (err: any) {
      setAuthError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  // Email OTP - Step 2: Verify code
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoading(true);

    try {
      if (!otpCode || otpCode.length !== 6) throw new Error('Please enter the 6-digit code');

      const { session, error } = await authService.verifyOTP(email, otpCode);
      if (error) throw error;

      if (session) {
        setAuthSuccess('✅ Welcome! Loading...');
        setTimeout(() => {
          setCurrentScreen('home');
        }, 800);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Invalid code. Please try again.');
      setIsLoading(false);
    }
  };

  const handleBackFromOTP = () => {
    setAuthMode('email');
    setOtpCode('');
    setAuthError(null);
    setAuthSuccess(null);
  };

  return (
    <div
      className="h-[100dvh] bg-[#0B101B] flex flex-col overflow-hidden relative"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src="https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1400&q=80"
          alt=""
          className="w-full h-full object-cover opacity-[0.20]"
        />
        <div className="absolute inset-0 bg-[#0B101B]/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B101B] via-[#0B101B]/55 to-transparent" />
      </div>

      {/* Header */}
      <div className="relative z-10 px-6 pt-10 pb-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-white/80 text-xs font-bold tracking-[0.25em] mb-3">MOVEE</div>
          <h1 className="text-4xl font-black text-white mb-2 leading-tight">
            {showEmailAuth ? 'Sign in to continue' : 'Ready to start?'}
          </h1>
          <p className="text-white/55 text-sm">
            {showEmailAuth ? 'Sign in to track your progress & earn rewards' : 'Sign in to get started with challenges'}
          </p>
        </motion.div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 px-6 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] overflow-y-auto scrollbar-hide">
        {!showEmailAuth ? (
          // Initial screen - "Myself" button to trigger auth
          <div className="grid grid-cols-1 gap-4">
            <motion.button
              onClick={handleGuestStart}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              whileTap={{ scale: 0.98 }}
              className="group relative overflow-hidden rounded-2xl p-6 bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/8 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 opacity-0 group-hover:opacity-[0.06] transition-opacity duration-300" />

              <div className="relative z-10 flex items-center gap-4">
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>

                <div className="flex-1 text-left">
                  <h3 className="text-xl font-bold text-white mb-1">Get Started</h3>
                  <p className="text-white/60 text-sm">Sign in to begin your journey</p>
                </div>

                <div className="flex-shrink-0 w-6 h-6">
                  <svg className="w-6 h-6 text-white/35 group-hover:text-white/55 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </motion.button>
          </div>
        ) : (
          // Auth screen
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {authMode === 'email' ? (
              // Email input
              <>
                <form onSubmit={handleSubmitEmail} className="space-y-4">
                  <div>
                    <label className="block text-white/70 text-sm font-medium mb-2">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      disabled={isLoading}
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                    />
                  </div>

                  {authError && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                      {authError}
                    </div>
                  )}

                  {authSuccess && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-green-400 text-sm">
                      {authSuccess}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || !email}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
                  >
                    {isLoading ? 'Sending...' : 'Continue with Email'}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-[#0B101B] text-white/50">or</span>
                  </div>
                </div>

                {/* Apple Sign In */}
                <button
                  onClick={handleAppleSignIn}
                  disabled={isLoading}
                  className="w-full bg-white text-black font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors disabled:opacity-60 shadow-lg"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  Continue with Apple
                </button>
              </>
            ) : (
              // OTP verification
              <>
                <button
                  onClick={handleBackFromOTP}
                  className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>

                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div>
                    <label className="block text-white/70 text-sm font-medium mb-2">Verification Code</label>
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      disabled={isLoading}
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white text-center text-2xl tracking-widest placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                      maxLength={6}
                    />
                    <p className="text-white/50 text-xs mt-2">Enter the 6-digit code sent to {email}</p>
                  </div>

                  {authError && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                      {authError}
                    </div>
                  )}

                  {authSuccess && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-green-400 text-sm">
                      {authSuccess}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || otpCode.length !== 6}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
                  >
                    {isLoading ? 'Verifying...' : 'Verify & Continue'}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};
