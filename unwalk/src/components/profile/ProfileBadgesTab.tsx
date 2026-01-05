import { useState, useEffect } from 'react';
import { badgesService, type Badge } from '../../services/badgesService';
import { getUserGamificationStats, getMyLeaderboardPosition } from '../../lib/gamification';
import type { UserGamificationStats } from '../../types';
import { useChallengeStore } from '../../stores/useChallengeStore';

interface ProfileBadgesTabProps {
  userId?: string;
  isGuest: boolean;
}

export function ProfileBadgesTab({ userId, isGuest }: ProfileBadgesTabProps) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(false);
  const [gamificationStats, setGamificationStats] = useState<UserGamificationStats | null>(null);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);

  useEffect(() => {
    if (!isGuest && userId) {
      loadBadges();
    }
  }, [userId, isGuest]);

  const loadBadges = async () => {
    setLoading(true);
    try {
      const [badgesData, stats, myPosition] = await Promise.all([
        badgesService.getBadges(),
        getUserGamificationStats(),
        getMyLeaderboardPosition(),
      ]);
      setBadges(badgesData);
      setGamificationStats(stats);
      setLeaderboardRank(myPosition?.my_rank || null);
    } catch (error) {
      console.error('Failed to load badges:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isGuest) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🏆</div>
        <h3 className="text-lg font-bold mb-2">Sign in to view badges</h3>
        <p className="text-gray-600 dark:text-white/60 text-sm">
          Track your achievements and earn rewards
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      {gamificationStats && (
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3 text-sm text-gray-500 dark:text-white/50">
            <span>{badges.filter(b => b.unlocked).length}/{badges.length} unlocked</span>
            <span>•</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold">Level {gamificationStats.level}</span>
            <span>•</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold">{gamificationStats.xp} XP</span>
            {leaderboardRank && (
              <>
                <span>•</span>
                <span className="text-purple-600 dark:text-purple-400 font-bold">Rank #{leaderboardRank}</span>
              </>
            )}
          </div>

          {/* View Full Leaderboard Button */}
          <button
            onClick={() => setCurrentScreen('leaderboard')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors flex items-center justify-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
            </svg>
            View Full Leaderboard
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-white/50 text-sm mt-3">Loading badges...</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {badges.map((badge) => {
            const gradientClass = badge.unlocked ? 
              badge.gradient === 'from-blue-400 to-blue-600' ? 'bg-gradient-to-br from-blue-400 to-blue-600' :
              badge.gradient === 'from-orange-400 to-red-600' ? 'bg-gradient-to-br from-orange-400 to-red-600' :
              badge.gradient === 'from-purple-400 to-purple-600' ? 'bg-gradient-to-br from-purple-400 to-purple-600' :
              badge.gradient === 'from-green-400 to-green-600' ? 'bg-gradient-to-br from-green-400 to-green-600' :
              badge.gradient === 'from-pink-400 to-pink-600' ? 'bg-gradient-to-br from-pink-400 to-pink-600' :
              badge.gradient === 'from-cyan-400 to-cyan-600' ? 'bg-gradient-to-br from-cyan-400 to-cyan-600' :
              badge.gradient === 'from-indigo-400 to-indigo-600' ? 'bg-gradient-to-br from-indigo-400 to-indigo-600' :
              badge.gradient === 'from-amber-400 to-amber-600' ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
              badge.gradient === 'from-teal-400 to-teal-600' ? 'bg-gradient-to-br from-teal-400 to-teal-600' :
              `bg-gradient-to-br ${badge.gradient}`
              : '';

            return (
              <div
                key={badge.id}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-[#151A25] border border-gray-200 dark:border-white/5"
              >
                <div className="relative">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
                      badge.unlocked
                        ? gradientClass
                        : 'bg-gray-100 dark:bg-[#0B101B] border-2 border-gray-300 dark:border-white/10'
                    }`}
                  >
                    <div className={`text-2xl ${!badge.unlocked && 'grayscale opacity-30'}`}>
                      {badge.icon}
                    </div>

                    {!badge.unlocked && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-400 dark:text-white/20" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                <div className={`text-xs font-bold text-center leading-tight ${
                  badge.unlocked ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-white/40'
                }`}>
                  {badge.title}
                </div>

                <div className={`text-[10px] leading-snug text-center h-8 flex items-center ${
                  badge.unlocked ? 'text-gray-500 dark:text-white/50' : 'text-gray-400 dark:text-white/30'
                }`}>
                  {badge.description}
                </div>

                {badge.unlocked && (
                  <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                    +{badge.points}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-white dark:bg-[#151A25] border border-gray-200 dark:border-white/5 rounded-2xl p-5 text-center">
        <div className="text-2xl mb-2">✨</div>
        <p className="text-sm text-gray-600 dark:text-white/60 leading-relaxed">
          Complete challenges and stay active to unlock more badges and earn points
        </p>
      </div>
    </div>
  );
}
