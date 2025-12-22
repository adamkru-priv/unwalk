import { type UserProfile } from '../../lib/auth';
import { getGuestDisplayName } from '../../lib/deviceId';

interface AccountSectionProps {
  userProfile: UserProfile | null;
  isGuest: boolean;
  onSignOut: () => void;
  // Guest sign-in actions (variant B: inline in Account box)
  onEmailSignIn?: () => void;
  onAppleSignIn?: () => void;
  onGoogleSignIn?: () => void; // placeholder for Android/Google
}

export function AccountSection({
  userProfile,
  isGuest,
  onSignOut,
  onEmailSignIn,
  onAppleSignIn,
  onGoogleSignIn,
}: AccountSectionProps) {
  const signedIn = !!userProfile && !isGuest;

  const guestTitle = userProfile?.display_name || getGuestDisplayName();

  return (
    <section
      className={`relative overflow-hidden rounded-2xl p-4 shadow-sm border transition-colors ${
        signedIn
          ? 'bg-white dark:bg-[#151A25] border-amber-200/70 dark:border-amber-500/25'
          : 'bg-white dark:bg-[#151A25] border-gray-100 dark:border-white/5'
      }`}
    >
      {/* subtle gradient / shine */}
      <div className="pointer-events-none absolute inset-0">
        {signedIn ? (
          <>
            {/* warm premium glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-gradient-to-br from-amber-400/25 via-orange-400/15 to-transparent blur-3xl" />
            <div className="absolute -bottom-28 -left-28 w-72 h-72 rounded-full bg-gradient-to-tr from-purple-500/15 via-fuchsia-500/10 to-transparent blur-3xl" />
            <div className="absolute inset-0 bg-gradient-to-b from-amber-50/40 to-transparent dark:from-amber-500/10" />
          </>
        ) : (
          <>
            <div className="absolute -top-24 -right-24 w-56 h-56 rounded-full bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent blur-2xl" />
            <div className="absolute -bottom-24 -left-24 w-56 h-56 rounded-full bg-gradient-to-tr from-emerald-400/10 via-cyan-400/10 to-transparent blur-2xl" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent dark:from-white/5" />
          </>
        )}
      </div>

      {/* premium ring */}
      {signedIn && (
        <div className="pointer-events-none absolute -inset-[1px] rounded-2xl ring-1 ring-amber-400/30 dark:ring-amber-400/20" />
      )}

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Account</h2>
          {signedIn ? (
            <span className="text-[10px] font-black tracking-[0.22em] uppercase text-amber-700/80 dark:text-amber-300/80 bg-amber-500/10 border border-amber-400/20 rounded-full px-2 py-1">
              Pro
            </span>
          ) : (
            <span className="text-[10px] font-black tracking-[0.22em] uppercase text-gray-700/70 dark:text-white/55 bg-gray-100/80 dark:bg-white/5 border border-gray-200/70 dark:border-white/10 rounded-full px-2 py-1">
              Guest
            </span>
          )}
        </div>

        {signedIn ? (
          <div className="flex items-center gap-3">
            {/* User Avatar */}
            <div className="shrink-0 h-11 w-11 rounded-full grid place-items-center bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-600/25 font-bold text-lg">
              {userProfile?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{userProfile!.email}</div>
              <div className="text-xs text-gray-600 dark:text-white/50">Signed in • syncing enabled</div>
            </div>

            <button
              onClick={onSignOut}
              className="shrink-0 px-3 py-2 rounded-xl bg-white/70 dark:bg-white/5 hover:bg-white/90 dark:hover:bg-white/10 border border-gray-200/60 dark:border-white/10 text-gray-800 dark:text-gray-200 text-xs font-semibold transition-colors"
            >
              Log out
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                You’re browsing as{' '}
                <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  {guestTitle}
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-600 dark:text-white/60">
                Log in for free to back up your streak, keep rewards, and access Team features.
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200/70 dark:border-white/10">
              <div className="text-[11px] font-bold tracking-[0.22em] uppercase text-gray-500 dark:text-white/40 mb-3">
                Sign in
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {/* Email */}
                <button
                  type="button"
                  onClick={onEmailSignIn}
                  disabled={!onEmailSignIn}
                  className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-all shadow-sm hover:shadow-md px-2 sm:px-3 py-3 active:scale-[0.99] disabled:opacity-50"
                  aria-label="Sign in with Email"
                >
                  <div className="flex flex-col items-center justify-center gap-2 min-w-0">
                    <div className="h-11 w-11 rounded-full grid place-items-center bg-blue-600 text-white shadow-lg shadow-blue-600/25 flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l9 6 9-6M4 6h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
                      </svg>
                    </div>
                    <div className="text-xs font-extrabold text-gray-900 dark:text-white text-center whitespace-nowrap">
                      Email
                    </div>
                  </div>
                </button>

                {/* Apple */}
                <button
                  type="button"
                  onClick={onAppleSignIn}
                  disabled={!onAppleSignIn}
                  className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-all shadow-sm hover:shadow-md px-2 sm:px-3 py-3 active:scale-[0.99] disabled:opacity-50"
                  aria-label="Sign in with Apple"
                >
                  <div className="flex flex-col items-center justify-center gap-2 min-w-0">
                    <div className="h-11 w-11 rounded-full grid place-items-center bg-black text-white shadow-lg shadow-black/35 flex-shrink-0">
                      <span className="text-lg"></span>
                    </div>
                    <div className="text-xs font-extrabold text-gray-900 dark:text-white text-center whitespace-nowrap">
                      Apple
                    </div>
                  </div>
                </button>

                {/* Google */}
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  disabled={!onGoogleSignIn}
                  className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-all shadow-sm hover:shadow-md px-2 sm:px-3 py-3 active:scale-[0.99] disabled:opacity-60"
                  aria-label="Sign in with Google"
                  title={!onGoogleSignIn ? 'Google sign-in (coming soon)' : undefined}
                >
                  <div className="flex flex-col items-center justify-center gap-2 min-w-0">
                    <div className="h-11 w-11 rounded-full grid place-items-center bg-white border border-gray-200 shadow-lg shadow-black/10 dark:bg-white dark:border-white/10 flex-shrink-0">
                      <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
                        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.604 32.659 29.237 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4c-7.682 0-14.366 4.342-17.694 10.691z"/>
                        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 19.013 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4c-7.682 0-14.366 4.342-17.694 10.691z"/>
                        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.197l-6.19-5.238C29.185 35.091 26.715 36 24 36c-5.216 0-9.572-3.318-11.264-7.946l-6.52 5.02C9.505 39.556 16.227 44 24 44z"/>
                        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.809 2.155-2.394 3.989-4.484 5.238l.003-.002 6.19 5.238C36.574 39.193 44 34 44 24c0-1.341-.138-2.651-.389-3.917z"/>
                      </svg>
                    </div>
                    <div className="text-xs font-extrabold text-gray-900 dark:text-white text-center whitespace-nowrap">
                      Google
                    </div>
                  </div>
                </button>
              </div>

              <div className="mt-3 text-[11px] text-gray-500 dark:text-white/40">
                Free • keep your progress safe.
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
