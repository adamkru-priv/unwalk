import { type UserTier } from '../../types';
import { useEffect, useRef } from 'react';

interface AccountTypeCardsProps {
  isGuest: boolean;
  userTier: UserTier;
  onTierChange: (_tier: 'pro') => void;
  onShowAuthModal: () => void;
}

export function AccountTypeCards({ isGuest, userTier, onTierChange, onShowAuthModal }: AccountTypeCardsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current plan on mount
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    const currentCardId = isGuest ? 'guest-card' : 'pro-card';
    const currentCard = document.getElementById(currentCardId);

    if (currentCard) {
      currentCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [isGuest, userTier]);

  return (
    <section className="bg-white dark:bg-[#151A25] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-white/5">
      <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span>⭐</span>
        <span>Account Type</span>
      </h2>

      <div
        ref={scrollContainerRef}
        id="account-type-scroll"
        className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory scrollbar-hide scroll-smooth"
      >
        {/* Guest Card */}
        <div
          id="guest-card"
          className={`min-w-[240px] flex-shrink-0 rounded-xl border-2 p-4 transition-all snap-center ${
            isGuest
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 shadow-lg ring-2 ring-blue-500/50'
              : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 opacity-75'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Guest</h3>
              {isGuest && (
                <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                  ACTIVE
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
              <span className="text-gray-400 dark:text-gray-500">Team features</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-500">✗</span>
              <span className="text-gray-400 dark:text-gray-500">Badges & points</span>
            </div>
          </div>

          {isGuest && (
            <button
              onClick={onShowAuthModal}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all"
            >
              Sign up →
            </button>
          )}
        </div>

        {/* Pro Card */}
        <div
          id="pro-card"
          className={`min-w-[240px] flex-shrink-0 rounded-xl border-2 p-4 transition-all snap-center ${
            !isGuest
              ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-500 shadow-lg ring-2 ring-amber-500/50'
              : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 opacity-75'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Pro ⭐</h3>
              {!isGuest && (
                <span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                  ACTIVE
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span>Team features</span>
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

          {isGuest ? (
            <div className="text-center text-xs text-gray-500 dark:text-gray-400 italic">
              Sign up to unlock
            </div>
          ) : (
            <button
              onClick={() => onTierChange('pro')}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all"
            >
              Pro enabled
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-1 mt-3">
        <div className={`h-1.5 w-1.5 rounded-full transition-all ${isGuest ? 'bg-blue-500 w-4' : 'bg-gray-300 dark:bg-white/20'}`} />
        <div className={`h-1.5 w-1.5 rounded-full transition-all ${!isGuest ? 'bg-amber-500 w-4' : 'bg-gray-300 dark:bg-white/20'}`} />
      </div>
    </section>
  );
}
