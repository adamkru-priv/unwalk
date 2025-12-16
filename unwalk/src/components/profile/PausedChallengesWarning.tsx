import { type UserChallenge } from '../../types';

interface PausedChallengesWarningProps {
  isOpen: boolean;
  pausedChallenges: UserChallenge[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function PausedChallengesWarning({ isOpen, pausedChallenges, onConfirm, onCancel }: PausedChallengesWarningProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-5">
      <div className="bg-white dark:bg-[#151A25] border border-gray-200 dark:border-white/10 rounded-2xl p-6 max-w-sm w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Paused Challenges</h2>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          You have <span className="font-bold text-gray-900 dark:text-white">{pausedChallenges.length} paused challenge{pausedChallenges.length !== 1 ? 's' : ''}</span>.
        </p>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Downgrading to Basic will <span className="font-bold text-orange-600 dark:text-orange-400">permanently delete</span> all paused challenges. This action cannot be undone.
        </p>

        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-lg p-3 mb-4">
          <div className="text-xs font-semibold text-orange-800 dark:text-orange-300 mb-2">Challenges to be deleted:</div>
          <div className="space-y-1">
            {pausedChallenges.slice(0, 3).map((challenge) => (
              <div key={challenge.id} className="text-xs text-orange-700 dark:text-orange-400 flex items-center gap-1">
                <span>•</span>
                <span className="truncate">{challenge.admin_challenge?.title}</span>
              </div>
            ))}
            {pausedChallenges.length > 3 && (
              <div className="text-xs text-orange-700 dark:text-orange-400 italic">
                +{pausedChallenges.length - 3} more...
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors border border-gray-300 dark:border-white/10"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            Delete & Downgrade
          </button>
        </div>
      </div>
    </div>
  );
}
