import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { authService } from '../../lib/auth';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { useToastStore } from '../../stores/useToastStore';

export const AuthRequiredScreen = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);
  const addToast = useToastStore((s) => s.addToast);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleSendOTP = async () => {
    if (!email || !email.includes('@')) {
      addToast({ message: 'Please enter a valid email address', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await authService.signInWithOTP(email);
      
      if (error) {
        if (isMounted.current) {
          addToast({ message: 'Failed to send code. Please try again.', type: 'error' });
        }
        return;
      }

      if (isMounted.current) {
        addToast({ message: 'Code sent! Check your email.', type: 'success' });
        setStep('otp');
      }
    } catch (error) {
      if (isMounted.current) {
        addToast({ message: 'Something went wrong. Please try again.', type: 'error' });
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
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
        if (isMounted.current) {
          addToast({ message: 'Invalid code. Please try again.', type: 'error' });
        }
        return;
      }

      // Convert guest to authenticated user if needed
      await authService.convertGuestToUser();
      
      if (isMounted.current) {
        addToast({ message: 'Welcome! 🎉', type: 'success' });
        
        // User is now authenticated, can proceed to home
        setCurrentScreen('home');
      }
    } catch (error) {
      if (isMounted.current) {
        addToast({ message: 'Something went wrong. Please try again.', type: 'error' });
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (step === 'otp') {
      setStep('email');
      setOtp('');
    } else {
      // Go back to WhoToChallenge screen
      setCurrentScreen('whoToChallenge');
    }
  };

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
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center text-4xl shadow-xl">
              {step === 'email' ? '✉️' : '🔐'}
            </div>
            <h1 className="text-3xl font-black text-white mb-3">
              {step === 'email' ? 'Sign In' : 'Enter Code'}
            </h1>
            <p className="text-white/60 text-base">
              {step === 'email' 
                ? 'To challenge others, sign in with your email'
                : `We sent a code to ${email}`
              }
            </p>
          </motion.div>

          {/* Email Step */}
          {step === 'email' && (
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
          )}

          {/* OTP Step */}
          {step === 'otp' && (
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
          )}

          {/* Info Box */}
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
};
