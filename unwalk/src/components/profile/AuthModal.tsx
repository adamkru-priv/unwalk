interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  authMode: 'email' | 'verify-otp';
  email: string;
  otpCode: string;
  authLoading: boolean;
  authError: string | null;
  authSuccess: string | null;
  onEmailChange: (email: string) => void;
  onOtpChange: (otp: string) => void;
  onSubmitEmail: (e: React.FormEvent) => void;
  onVerifyOTP: (e: React.FormEvent) => void;
  onBack: () => void;
}

export function AuthModal({
  isOpen,
  onClose,
  authMode,
  email,
  otpCode,
  authLoading,
  authError,
  authSuccess,
  onEmailChange,
  onOtpChange,
  onSubmitEmail,
  onVerifyOTP,
  onBack
}: AuthModalProps) {
  if (!isOpen) return null;

  const allowBackdropClose = authMode === 'email';

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5"
      onClick={allowBackdropClose ? onClose : undefined}
    >
      <div
        className="bg-white dark:bg-[#151A25] rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {authMode === 'email' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Sign In</h2>
              <button
                onClick={onClose}
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

            {authSuccess && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-sm text-green-600 dark:text-green-400 mb-4">
                {authSuccess}
              </div>
            )}

            <form onSubmit={onSubmitEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => onEmailChange(e.target.value)}
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
              onClick={onBack}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-1 text-sm font-bold"
            >
              ← Back
            </button>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Enter your code</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
              We sent a 6-digit code to <strong>{email}</strong>
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-xs mb-6">
              If you don’t see it within a minute, check Spam/Promotions.
            </p>

            <form onSubmit={onVerifyOTP} className="space-y-4">
              <input
                type="text"
                value={otpCode}
                onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-2xl font-bold tracking-widest focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-colors"
                disabled={authLoading}
                autoFocus
                maxLength={6}
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
                disabled={authLoading || otpCode.length !== 6}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
              >
                {authLoading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
