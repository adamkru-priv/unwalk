import { useEffect, useState } from 'react';
import { getCompletedChallenges } from '../../lib/api';
import type { UserChallenge } from '../../types';
import { useChallengeStore } from '../../stores/useChallengeStore';

type ChallengeHistoryProps = {
  /** When true, renders only main content (no AppHeader / BottomNavigation). */
  embedded?: boolean;
};

export function ChallengeHistory({ embedded = false }: ChallengeHistoryProps) {
  const [completedChallenges, setCompletedChallenges] = useState<UserChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const userProfile = useChallengeStore((s) => s.userProfile);
  const isGuest = userProfile?.is_guest ?? true;

  useEffect(() => {
    loadCompletedChallenges();
  }, []);

  const loadCompletedChallenges = async () => {
    try {
      setLoading(true);
      const challenges = await getCompletedChallenges();
      setCompletedChallenges(challenges);
    } catch (error) {
      console.error('Failed to load challenge history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate XP for challenge (same logic as in calculateChallengePoints)
  const calculateXP = (goalSteps: number) => {
    if (goalSteps <= 5000) return 25;
    else if (goalSteps <= 10000) return 50;
    else if (goalSteps <= 15000) return 75;
    else if (goalSteps <= 25000) return 125;
    else return 200;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div className={embedded ? '' : 'min-h-screen bg-gray-50 dark:bg-[#0B101B] pb-20'}>
      {/* Image Preview Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-lg w-full">
            <img
              src={selectedImage}
              alt="Challenge"
              className="w-full h-auto rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      <div className={embedded ? '' : 'px-4 py-6'}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : completedChallenges.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🎯</div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">No challenge history yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {completedChallenges.map((challenge) => {
              const xp = challenge.admin_challenge?.goal_steps 
                ? calculateXP(challenge.admin_challenge.goal_steps) 
                : 0;
              
              return (
                <div
                  key={challenge.id}
                  className="flex items-center gap-3 py-2.5 px-3 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                >
                  {/* Image Thumbnail */}
                  {challenge.admin_challenge?.image_url && (
                    <button
                      onClick={() => setSelectedImage(challenge.admin_challenge!.image_url)}
                      className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-800 hover:ring-2 hover:ring-blue-500 transition-all"
                    >
                      <img
                        src={challenge.admin_challenge.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  )}

                  {/* Challenge Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[15px] font-medium text-gray-900 dark:text-white truncate">
                        {challenge.admin_challenge?.title}
                      </span>
                      {!isGuest && xp > 0 && (
                        <span className="text-[13px] font-semibold text-amber-600 dark:text-amber-400 flex-shrink-0">
                          +{xp} XP
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
                      <span>{challenge.current_steps.toLocaleString()} steps</span>
                      <span>•</span>
                      <span>{formatDate(challenge.completed_at || challenge.claimed_at || '')}</span>
                    </div>
                  </div>

                  {/* Checkmark */}
                  <div className="w-5 h-5 rounded-full bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}