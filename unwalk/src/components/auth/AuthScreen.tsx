import { useState } from 'react';
import { authService } from '../../lib/auth';

interface AuthScreenProps {
  onSuccess: () => void;
}

type AuthMode = 'email' | 'otp-sent' | 'verify-otp';

export function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [useMagicLink, setUseMagicLink] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (!email) {
        throw new Error('Please enter your email');
      }

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email');
      }

      if (useMagicLink) {
        // Send Magic Link
        const { error } = await authService.signInWithMagicLink(email);
        if (error) throw error;

        setSuccess('✉️ Check your email! We sent you a magic link.');
        setMode('otp-sent');
      } else {
        // Send OTP
        const { error } = await authService.signInWithOTP(email);
        if (error) throw error;

        setSuccess('🔢 Check your email! We sent you a 6-digit code.');
        setMode('verify-otp');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!otpCode || otpCode.length !== 6) {
        throw new Error('Please enter the 6-digit code');
      }

      const { session, error } = await authService.verifyOTP(email, otpCode);
      if (error) throw error;

      if (session) {
        setSuccess('✅ Welcome! Redirecting...');
        setTimeout(() => {
          onSuccess();
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setMode('email');
    setOtpCode('');
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-5xl font-black rounded-3xl w-20 h-20 flex items-center justify-center mb-4 shadow-xl">
            👟
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
            UnWalk
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Walk challenges with friends
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
          {mode === 'email' && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome back
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Sign in to continue your challenges
              </p>

              <form onSubmit={handleSubmitEmail} className="space-y-4">
                {/* Email Input */}
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
                    disabled={loading}
                    autoFocus
                  />
                </div>

                {/* Method Toggle */}
                <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setUseMagicLink(true)}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${
                      useMagicLink
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-md'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    ✉️ Magic Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseMagicLink(false)}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${
                      !useMagicLink
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-md'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    🔢 OTP Code
                  </button>
                </div>

                {/* Info */}
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  {useMagicLink ? (
                    <>
                      <strong>Magic Link:</strong> We'll send you an email with a link. Click
                      it to sign in instantly!
                    </>
                  ) : (
                    <>
                      <strong>OTP Code:</strong> We'll send you a 6-digit code. Enter it on
                      the next screen.
                    </>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {loading ? 'Sending...' : 'Continue'}
                </button>
              </form>
            </>
          )}

          {mode === 'otp-sent' && (
            <>
              <div className="text-center mb-6">
                <div className="inline-block bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-4xl rounded-full w-16 h-16 flex items-center justify-center mb-4">
                  ✉️
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Check your email
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  We sent a magic link to:
                </p>
                <p className="text-blue-600 dark:text-blue-400 font-bold mt-1">{email}</p>
              </div>

              {success && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-sm text-green-600 dark:text-green-400 mb-4">
                  {success}
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleSubmitEmail}
                  disabled={loading}
                  className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-bold py-3 rounded-xl transition-all"
                >
                  Resend email
                </button>
                <button
                  onClick={handleBack}
                  className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-bold py-3 rounded-xl transition-all"
                >
                  ← Back
                </button>
              </div>
            </>
          )}

          {mode === 'verify-otp' && (
            <>
              <button
                onClick={handleBack}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-1 text-sm font-bold"
              >
                ← Back
              </button>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Enter your code
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                We sent a 6-digit code to <strong>{email}</strong>
              </p>

              <form onSubmit={handleVerifyOTP} className="space-y-4">
                {/* OTP Input */}
                <div>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-2xl font-bold tracking-widest focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-colors"
                    disabled={loading}
                    autoFocus
                    maxLength={6}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    Enter the 6-digit code from your email
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}

                {/* Success */}
                {success && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-sm text-green-600 dark:text-green-400">
                    {success}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </button>

                {/* Resend */}
                <button
                  type="button"
                  onClick={handleSubmitEmail}
                  disabled={loading}
                  className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-bold py-2"
                >
                  Didn't receive? Resend code
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
          By continuing, you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
}
