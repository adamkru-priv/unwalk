import { BottomNavigation } from '../common/BottomNavigation';
import { AppHeader } from '../common/AppHeader';
import { useEffect, useState } from 'react';
import { getCompletedChallenges } from '../../lib/api';
import type { UserChallenge } from '../../types';
import { useChallengeStore } from '../../stores/useChallengeStore';

export function StatsScreen() {
  const [completedChallenges, setCompletedChallenges] = useState<UserChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChallenge, setSelectedChallenge] = useState<UserChallenge | null>(null);
  const userTier = useChallengeStore((s) => s.userTier);
  const userProfile = useChallengeStore((s) => s.userProfile);

  useEffect(() => {
    loadCompletedChallenges();
  }, []);

  const loadCompletedChallenges = async () => {
    try {
      setLoading(true);
      const challenges = await getCompletedChallenges();
      setCompletedChallenges(challenges);
      console.log('✅ [StatsScreen] Loaded completed challenges:', challenges.length);
    } catch (error) {
      console.error('Failed to load completed challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate total stats from completed challenges ONLY
  const totalSteps = completedChallenges.reduce((sum, c) => sum + c.current_steps, 0);
  const totalDistance = ((totalSteps * 0.8) / 1000).toFixed(1);
  const completedCount = completedChallenges.length;

  // Calculate total active time across all challenges
  const totalActiveTimeSeconds = completedChallenges.reduce((sum, c) => sum + (c.active_time_seconds || 0), 0);
  const totalDays = Math.floor(totalActiveTimeSeconds / 86400);
  const totalHours = Math.floor((totalActiveTimeSeconds % 86400) / 3600);

  // Get total points from user profile (includes challenge points + badge points)
  const totalPoints = userProfile?.total_points || 0;

  // Format active time for challenge
  const formatActiveTime = (challenge: UserChallenge) => {
    const totalSeconds = challenge.active_time_seconds || 0;
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return '< 1h';
    }
  };

  // Format completion date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get first challenge date
  const firstChallengeDate = completedChallenges.length > 0
    ? new Date(completedChallenges[completedChallenges.length - 1].started_at || completedChallenges[completedChallenges.length - 1].completed_at || Date.now())
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B101B] text-gray-900 dark:text-white pb-20 font-sans">
      <AppHeader showBackButton={true} />

      {/* Image Preview Modal */}
      {selectedChallenge && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-5"
          onClick={() => setSelectedChallenge(null)}
        >
          <div className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-4">
              <img
                src={selectedChallenge.admin_challenge?.image_url}
                alt={selectedChallenge.admin_challenge?.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-2">
                {selectedChallenge.admin_challenge?.title}
              </h3>
              <p className="text-white/60 text-sm">
                {selectedChallenge.current_steps.toLocaleString()} steps • {((selectedChallenge.current_steps * 0.8) / 1000).toFixed(1)}km
              </p>
            </div>
          </div>
        </div>
      )}

      <main className="px-5 py-6 max-w-4xl mx-auto space-y-6">
        {/* Overall Summary - Compact */}
        <section className="bg-white dark:bg-[#151A25] border border-gray-200 dark:border-white/5 rounded-2xl p-5">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Your Stats</span>
            {firstChallengeDate && (
              <span className="text-xs text-gray-500 dark:text-white/40 font-normal ml-auto">
                Since {firstChallengeDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            )}
          </h2>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-[#0B101B] border border-gray-200 dark:border-white/5 rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mb-1">
                {totalSteps.toLocaleString()}
              </div>
              <div className="text-xs text-gray-600 dark:text-white/60">Total Steps</div>
            </div>
            <div className="bg-gray-50 dark:bg-[#0B101B] border border-gray-200 dark:border-white/5 rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-green-600 dark:text-green-400 mb-1">
                {totalDistance}km
              </div>
              <div className="text-xs text-gray-600 dark:text-white/60">Distance</div>
            </div>
            <div className="bg-gray-50 dark:bg-[#0B101B] border border-gray-200 dark:border-white/5 rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mb-1">
                {completedCount}
              </div>
              <div className="text-xs text-gray-600 dark:text-white/60">Completed</div>
            </div>
            <div className="bg-gray-50 dark:bg-[#0B101B] border border-gray-200 dark:border-white/5 rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-orange-600 dark:text-orange-400 mb-1">
                {totalDays > 0 ? `${totalDays}d ${totalHours}h` : totalHours > 0 ? `${totalHours}h` : '< 1h'}
              </div>
              <div className="text-xs text-gray-600 dark:text-white/60">Active Time</div>
            </div>
          </div>

          {/* Points for Pro users */}
          {userTier === 'pro' && totalPoints > 0 && (
            <div className="mt-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-300 dark:border-amber-500/30 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-amber-900 dark:text-amber-400 mb-0.5">
                {totalPoints} Points
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-500 font-semibold">
                Total Points Earned
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500 dark:text-white/40 text-center mt-3">
            Stats from completed challenges only
          </p>
        </section>

        {/* Challenge History */}
        <section className="bg-white dark:bg-[#151A25] border border-gray-200 dark:border-white/5 rounded-2xl p-5">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span>🏆</span>
            <span>Challenge History</span>
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-gray-200 dark:border-white/10 border-t-blue-500 rounded-full animate-spin mb-3"></div>
              <p className="text-gray-600 dark:text-white/60 text-sm">Loading history...</p>
            </div>
          ) : completedChallenges.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">🎯</div>
              <p className="text-gray-600 dark:text-white/60 text-sm mb-2">No completed challenges yet</p>
              <p className="text-gray-500 dark:text-white/40 text-xs">Complete your first challenge to see it here!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedChallenges.map((challenge) => (
                <div
                  key={challenge.id}
                  className="bg-gray-50 dark:bg-[#0B101B] border border-gray-200 dark:border-white/5 rounded-xl p-3 hover:border-gray-300 dark:hover:border-white/10 transition-all"
                >
                  <div className="flex items-start gap-3">
                    {/* Challenge Image - Clickable & Revealed */}
                    <button
                      onClick={() => setSelectedChallenge(challenge)}
                      className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 ring-2 ring-green-500/50 hover:ring-green-500 transition-all group"
                    >
                      <img
                        src={challenge.admin_challenge?.image_url}
                        alt={challenge.admin_challenge?.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      {/* Subtle checkmark overlay */}
                      <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                        <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </button>

                    {/* Challenge Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1 truncate">
                        {challenge.admin_challenge?.title}
                      </h3>
                      
                      {/* Stats Row */}
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-white/60 mb-1.5">
                        <span>{challenge.current_steps.toLocaleString()} steps</span>
                        <span>•</span>
                        <span>{((challenge.current_steps * 0.8) / 1000).toFixed(1)}km</span>
                        <span>•</span>
                        <span>{formatActiveTime(challenge)}</span>
                      </div>

                      {/* Date & Type */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500 dark:text-white/50">
                          {challenge.completed_at ? formatDate(challenge.completed_at) : 'Recently'}
                        </span>
                        
                        {/* Badge indicators */}
                        {challenge.assigned_by && (
                          <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                            SOCIAL
                          </span>
                        )}
                        {challenge.admin_challenge?.is_custom && (
                          <span className="bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-500/30">
                            CUSTOM
                          </span>
                        )}
                        {!challenge.admin_challenge?.is_custom && userTier === 'pro' && (
                          <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                            +{(() => {
                              const goalSteps = challenge.admin_challenge?.goal_steps || 0;
                              if (goalSteps <= 5000) return 5;
                              else if (goalSteps <= 10000) return 10;
                              else if (goalSteps <= 15000) return 15;
                              else if (goalSteps <= 25000) return 25;
                              else return 50;
                            })()} PTS
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation currentScreen="home" />
    </div>
  );
}
