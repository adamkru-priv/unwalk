import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';
import { 
  getGlobalLeaderboard, 
  getMyLeaderboardPosition,
  type LeaderboardEntry,
  type MyLeaderboardPosition 
} from '../../lib/gamification';
import { useChallengeStore } from '../../stores/useChallengeStore';

export function LeaderboardScreen() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myPosition, setMyPosition] = useState<MyLeaderboardPosition | null>(null);
  const [loading, setLoading] = useState(true);
  const userProfile = useChallengeStore((s) => s.userProfile);
  const isGuest = userProfile?.is_guest ?? false;

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const [leaderboardData, positionData] = await Promise.all([
        getGlobalLeaderboard(100, 0),
        getMyLeaderboardPosition(),
      ]);
      
      setLeaderboard(leaderboardData);
      setMyPosition(positionData);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalEmoji = (rank: number): string => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  };

  if (isGuest) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0B101B] text-gray-900 dark:text-white pb-24">
        <AppHeader />
        <div className="px-5 py-12 text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold mb-2">Global Leaderboard</h2>
          <p className="text-gray-600 dark:text-white/60 mb-6">
            Sign in to compete with other users and see where you rank!
          </p>
          <button
            onClick={() => useChallengeStore.setState({ currentScreen: 'profile' })}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Sign In to Compete
          </button>
        </div>
        <BottomNavigation currentScreen="leaderboard" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B101B] text-gray-900 dark:text-white pb-24">
      <AppHeader />

      <main className="px-5 py-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black mb-2">🏆 Leaderboard</h1>
          {leaderboard.length > 0 && leaderboard[0].campaign_number && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-white/60">
              <span>Campaign #{leaderboard[0].campaign_number}</span>
              <span>•</span>
              <span>{myPosition?.days_remaining || 0} days left</span>
            </div>
          )}
        </div>

        {/* My Position - Subtle highlight */}
        {myPosition && (
          <div className="mb-6 pb-4 border-b border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 dark:text-white/50 uppercase tracking-wide mb-1">Your Rank</div>
                <div className="text-2xl font-bold">#{myPosition.my_rank}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 dark:text-white/50">Top {myPosition.percentile}%</div>
                <div className="text-sm text-gray-600 dark:text-white/60">
                  of {myPosition.total_users.toLocaleString()} users
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-300 dark:border-white/20 mb-4"></div>
            <p className="text-gray-400 text-sm">Loading...</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="text-lg font-bold mb-2">No rankings yet</h3>
            <p className="text-gray-600 dark:text-white/60 text-sm">
              Complete challenges to appear here!
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {leaderboard
              .filter(entry => entry.xp_in_campaign > 0)
              .map((entry, index) => (
              <motion.div
                key={entry.user_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`
                  flex items-center gap-3 py-2.5 px-3 rounded-lg
                  ${entry.is_current_user 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' 
                    : 'hover:bg-gray-100 dark:hover:bg-white/5'
                  }
                  transition-colors
                `}
              >
                {/* Rank */}
                <div className="flex-shrink-0 w-8 text-center">
                  {getMedalEmoji(entry.rank) ? (
                    <span className="text-2xl">{getMedalEmoji(entry.rank)}</span>
                  ) : (
                    <span className="text-sm font-semibold text-gray-400 dark:text-white/40">
                      {entry.rank}
                    </span>
                  )}
                </div>

                {/* User Name */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm truncate text-gray-900 dark:text-white">
                      {entry.display_name}
                    </h3>
                    {entry.is_current_user && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                        (You)
                      </span>
                    )}
                  </div>
                </div>

                {/* XP */}
                <div className="flex-shrink-0 text-right">
                  <div className="text-base font-semibold text-gray-900 dark:text-white">
                    {entry.xp_in_campaign.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-white/50">
                    XP
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Refresh */}
        <div className="mt-6 text-center">
          <button
            onClick={loadLeaderboard}
            className="text-sm text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white font-medium inline-flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </main>

      <BottomNavigation currentScreen="leaderboard" />
    </div>
  );
}