import type { UserChallenge } from '../../../types';

interface CompletedChallengesListProps {
  challenges: UserChallenge[];
  userTier: 'basic' | 'pro';
  onChallengeClick: (challenge: UserChallenge) => void;
}

export function CompletedChallengesList({ challenges, userTier, onChallengeClick }: CompletedChallengesListProps) {
  if (challenges.length === 0) return null;

  return (
    <section className="px-5">
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-emerald-900 dark:text-emerald-400 mb-3 uppercase tracking-wide">
          {userTier === 'pro' ? '🎁 Rewards Ready' : '✓ Ready to Claim'}
        </h2>
        
        <div className="space-y-2.5">
          {challenges.map((challenge) => (
            <button
              key={challenge.id}
              onClick={() => onChallengeClick(challenge)}
              className="w-full bg-white dark:bg-white/5 hover:bg-emerald-50 dark:hover:bg-white/10 border border-emerald-200/50 dark:border-white/10 rounded-xl p-3.5 transition-all group flex items-center gap-3.5 text-left shadow-sm hover:shadow-md"
            >
              <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-emerald-400/50 group-hover:ring-emerald-500 transition-all">
                <img
                  src={challenge.admin_challenge?.image_url}
                  alt={challenge.admin_challenge?.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-0.5 truncate">
                  {challenge.admin_challenge?.title}
                </h3>
                <div className="text-xs text-gray-600 dark:text-white/60 mb-1">
                  {challenge.current_steps.toLocaleString()} steps · {((challenge.current_steps * 0.8) / 1000).toFixed(1)}km
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                  {userTier === 'pro' ? 'Tap to claim reward →' : 'Tap to view completion →'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
