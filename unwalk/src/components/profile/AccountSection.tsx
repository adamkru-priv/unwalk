import { type UserProfile } from '../../lib/auth';
import { getGuestDisplayName } from '../../lib/deviceId';

interface AccountSectionProps {
  userProfile: UserProfile | null;
  isGuest: boolean;
  onSignOut: () => void;
  onShowAuthModal: () => void;
}

export function AccountSection({ userProfile, isGuest, onSignOut, onShowAuthModal }: AccountSectionProps) {
  return (
    <section className="relative overflow-hidden bg-white dark:bg-[#151A25] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-white/5">
      {/* subtle gradient / shine */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -right-24 w-56 h-56 rounded-full bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent blur-2xl" />
        <div className="absolute -bottom-24 -left-24 w-56 h-56 rounded-full bg-gradient-to-tr from-emerald-400/10 via-cyan-400/10 to-transparent blur-2xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent dark:from-white/5" />
      </div>

      <div className="relative">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Account</h2>

        {userProfile && !isGuest ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {userProfile.email}
              </div>
              <div className="text-xs text-gray-500 dark:text-white/40">Signed in</div>
            </div>

            <button
              onClick={onSignOut}
              className="shrink-0 px-3 py-2 rounded-xl bg-white/60 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 border border-gray-200/60 dark:border-white/10 text-gray-800 dark:text-gray-200 text-xs font-semibold transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {userProfile?.display_name || getGuestDisplayName()}
              </div>
              <div className="text-xs text-gray-500 dark:text-white/40 truncate">
                Sign in to sync & unlock Pro
              </div>
            </div>

            <button
              onClick={onShowAuthModal}
              className="shrink-0 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all shadow-sm"
            >
              Sign In
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
