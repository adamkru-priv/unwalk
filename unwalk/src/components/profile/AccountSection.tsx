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
    <section className="bg-white dark:bg-[#151A25] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-white/5">
      <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span>👤</span>
        <span>Account</span>
      </h2>
      
      {userProfile && !isGuest ? (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {userProfile.email}
          </div>
          
          <button
            onClick={onSignOut}
            className="w-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>
      ) : (
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
            onClick={onShowAuthModal}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            Sign In
          </button>
        </div>
      )}
    </section>
  );
}
