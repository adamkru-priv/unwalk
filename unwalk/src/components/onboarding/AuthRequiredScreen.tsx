import { useState } from 'react';
import { motion } from 'framer-motion';
import { authService } from '../../lib/auth';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { useToastStore } from '../../stores/useToastStore';

export const AuthRequiredScreen = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'signin' | 'email' | 'otp'>('signin'); // 🎯 NEW: Start with sign-in options
  const [isLoading, setIsLoading] = useState(false);
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);
  const setOnboardingComplete = useChallengeStore((s) => s.setOnboardingComplete);
  const addToast = useToastStore((s) => s.addToast);

  const handleEmailSignIn = () => {
    setStep('email');
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await authService.signInWithApple();
      if (error) {
        addToast({ message: error.message || 'Apple sign-in failed', type: 'error' });
      }
    } catch (e: any) {
      addToast({ message: e?.message || 'Apple sign-in failed', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!email || !email.includes('@')) {
      addToast({ message: 'Please enter a valid email address', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await authService.signInWithOTP(email);
      
      if (error) {
        addToast({ message: 'Failed to send code. Please try again.', type: 'error' });
        return;
      }

      addToast({ message: 'Code sent! Check your email.', type: 'success' });
      setStep('otp');
    } catch (error) {
      addToast({ message: 'Something went wrong. Please try again.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      addToast({ message: 'Code must be 6 digits', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const { session, error } = await authService.verifyOTP(email, otp);
      
      if (error || !session) {
        addToast({ message: 'Invalid code. Please try again.', type: 'error' });
        return;
      }

      // Convert guest to authenticated user if needed
      await authService.convertGuestToUser();
      
      addToast({ message: 'Welcome! 🎉', type: 'success' });
      
      // User is now authenticated, can proceed to home
      setOnboardingComplete(true);
      setCurrentScreen('home');
    } catch (error) {
      addToast({ message: 'Something went wrong. Please try again.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'otp') {
      setStep('email');
      setOtp('');
    } else if (step === 'email') {
      setStep('signin');
      setEmail('');
    } else {
      // Go back to landing page
      setOnboardingComplete(false);
      setCurrentScreen('home');
    }
  };

  // 🎯 NEW: Sign-in options screen (like ProfileScreen)
  if (step === 'signin') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0B101B] to-[#151A25] flex flex-col">
        {/* Back Button */}
        <div className="px-6 pt-8">
          <button
            onClick={handleBack}
            disabled={isLoading}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Back</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center px-6 pb-16">
          <div className="w-full max-w-md mx-auto">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-4xl shadow-xl">
                👋
              </div>
              <h1 className="text-3xl font-black text-white mb-3">
                Welcome to Movee
              </h1>
              <p className="text-white/60 text-base">
                Sign in to sync your progress and unlock team features
              </p>
            </motion.div>

            {/* Sign-in options */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-3"
            >
              {/* Email Sign In */}
              <button
                onClick={handleEmailSignIn}
                disabled={isLoading}
                className="w-full flex items-center gap-4 px-5 py-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all disabled:opacity-50"
              >
                <div className="h-12 w-12 rounded-full grid place-items-center bg-blue-600 text-white shadow-lg shadow-blue-600/25 flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l9 6 9-6M4 6h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-white font-bold">Continue with Email</div>
                  <div className="text-white/50 text-sm">We'll send you a code</div>
                </div>
              </button>

              {/* Apple Sign In */}
              <button
                onClick={handleAppleSignIn}
                disabled={isLoading}
                className="w-full flex items-center gap-4 px-5 py-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all disabled:opacity-50"
              >
                <div className="h-12 w-12 rounded-full grid place-items-center bg-black text-white shadow-lg shadow-black/35 flex-shrink-0">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-white font-bold">Continue with Apple</div>
                  <div className="text-white/50 text-sm">Quick & secure</div>
                </div>
              </button>

              {/* Google Sign In (disabled) */}
              <button
                disabled
                className="w-full flex items-center gap-4 px-5 py-4 bg-white/5 border border-white/10 rounded-2xl opacity-50 cursor-not-allowed"
              >
                <div className="h-12 w-12 rounded-full grid place-items-center bg-white border border-gray-200 shadow-lg shadow-black/10 flex-shrink-0">
                  <svg className="w-6 h-6" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.604 32.659 29.237 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4c-7.682 0-14.366 4.342-17.694 10.691z"/>
                    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 19.013 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4c-7.682 0-14.366 4.342-17.694 10.691z"/>
                    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.197l-6.19-5.238C29.185 35.091 26.715 36 24 36c-5.216 0-9.572-3.318-11.264-7.946l-6.52 5.02C9.505 39.556 16.227 44 24 44z"/>
                    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.809 2.155-2.394 3.989-4.484 5.238l.003-.002 6.19 5.238C36.574 39.193 44 34 44 24c0-1.341-.138-2.651-.389-3.917z"/>
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-white font-bold">Continue with Google</div>
                  <div className="text-white/50 text-sm">Coming soon</div>
                </div>
              </button>
            </motion.div>

            {/* 🎯 REMOVED: "Continue as Guest" option - authentication required */}

            {/* Info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-8 px-4 py-3 bg-blue-500/10 rounded-xl border border-blue-500/20"
            >
              <p className="text-xs text-blue-400 text-center">
                💡 Sign in to get started • Free forever
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // Email Step
  if (step === 'email') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0B101B] to-[#151A25] flex flex-col">
        {/* Back Button */}
        <div className="px-6 pt-8">
          <button
            onClick={handleBack}
            disabled={isLoading}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Back</span>
          </button>
        </div>

        <div className="flex-1 flex items-center px-6 pb-16">
          <div className="w-full max-w-md mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center text-4xl shadow-xl">
                ✉️
              </div>
              <h1 className="text-3xl font-black text-white mb-3">Sign In</h1>
              <p className="text-white/60 text-base">
                To challenge others, sign in with your email
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold text-white/80 mb-2 ml-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              <button
                onClick={handleSendOTP}
                disabled={isLoading || !email}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold text-lg rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                    Sending...
                  </span>
                ) : (
                  'Send Code'
                )}
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 px-4 py-3 bg-blue-500/10 rounded-xl border border-blue-500/20"
            >
              <p className="text-sm text-blue-400 text-center">
                💡 You'll receive a 6-digit code via email
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // OTP Step
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B101B] to-[#151A25] flex flex-col">
      {/* Back Button */}
      <div className="px-6 pt-8">
        <button
          onClick={handleBack}
          disabled={isLoading}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium">Back</span>
        </button>
      </div>

      <div className="flex-1 flex items-center px-6 pb-16">
        <div className="w-full max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center text-4xl shadow-xl">
              🔐
            </div>
            <h1 className="text-3xl font-black text-white mb-3">Enter Code</h1>
            <p className="text-white/60 text-base">
              We sent a code to {email}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-semibold text-white/80 mb-2 ml-1">
                Verification Code
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-center text-3xl font-bold tracking-[0.5em] placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyOTP()}
                disabled={isLoading}
                maxLength={6}
                autoFocus
              />
            </div>

            <button
              onClick={handleVerifyOTP}
              disabled={isLoading || otp.length !== 6}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold text-lg rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                  Verifying...
                </span>
              ) : (
                'Verify Code'
              )}
            </button>

            <button
              onClick={() => {
                setStep('email');
                setOtp('');
              }}
              disabled={isLoading}
              className="w-full py-3 text-white/60 hover:text-white transition-colors text-sm font-medium disabled:opacity-50"
            >
              Resend code
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 px-4 py-3 bg-blue-500/10 rounded-xl border border-blue-500/20"
          >
            <p className="text-sm text-blue-400 text-center">
              💡 Check your spam folder if you don't see it
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
