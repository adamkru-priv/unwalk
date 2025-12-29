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
        {/* Header with Campaign Info */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black mb-2">🏆 Campaign Leaderboard</h1>
          {leaderboard.length > 0 && leaderboard[0].campaign_number && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-white/60">
              <span className="font-semibold">Campaign #{leaderboard[0].campaign_number}</span>
              <span>•</span>
              <span>{myPosition?.days_remaining || 0} days left</span>
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-white/50 mt-1">
            Resets every 30 days - everyone starts fresh!
          </p>
        </div>

        {/* My Position Card */}
        {myPosition && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-4 mb-6 shadow-lg"
          >
            <div className="flex items-center justify-between text-white">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide opacity-80">Your Rank</div>
                <div className="text-3xl font-black">#{myPosition.my_rank}</div>
              </div>
              <div className="text-right">
                <div className="text-xs opacity-80">out of {myPosition.total_users.toLocaleString()} users</div>
                <div className="text-lg font-bold">Top {myPosition.percentile}%</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Leaderboard List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
            <p className="text-gray-400 text-sm">Loading leaderboard...</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="bg-white dark:bg-[#151A25] rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="text-lg font-bold mb-2">No rankings yet</h3>
            <p className="text-gray-600 dark:text-white/60 text-sm">
              Start completing challenges to appear on the leaderboard!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard
              .filter(entry => entry.xp_in_campaign > 0) // 🎯 FIX: Hide users with 0 XP
              .map((entry, index) => (
              <motion.div
                key={entry.user_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  bg-white dark:bg-[#151A25] rounded-xl p-4 flex items-center gap-4
                  ${entry.is_current_user ? 'ring-2 ring-blue-500 shadow-lg' : 'border border-gray-200 dark:border-white/10'}
                  transition-all hover:shadow-md
                `}
              >
                {/* Rank with Medal */}
                <div className="flex-shrink-0 w-12 text-center">
                  {getMedalEmoji(entry.rank) ? (
                    <span className="text-3xl">{getMedalEmoji(entry.rank)}</span>
                  ) : (
                    <span className="text-lg font-bold text-gray-500 dark:text-white/50">
                      #{entry.rank}
                    </span>
                  )}
                </div>

                {/* User Name */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 dark:text-white truncate">
                      {entry.display_name}
                    </h3>
                    {entry.is_current_user && (
                      <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        YOU
                      </span>
                    )}
                  </div>
                </div>

                {/* Campaign XP */}
                <div className="flex-shrink-0 text-right">
                  <div className="text-xl font-black text-gray-900 dark:text-white">
                    {entry.xp_in_campaign.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-white/50">XP</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">ℹ️</div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-blue-900 dark:text-blue-200 mb-1">
                30-Day Campaign
              </h3>
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                Rankings reset every 30 days. XP earned in this campaign counts toward your rank. 
                Your total XP and level are permanent!
              </p>
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mt-6 text-center">
          <button
            onClick={loadLeaderboard}
            className="text-sm text-blue-600 dark:text-blue-400 font-semibold hover:underline"
          >
            🔄 Refresh Leaderboard
          </button>
        </div>
      </main>

      <BottomNavigation currentScreen="leaderboard" />
    </div>
  );
}