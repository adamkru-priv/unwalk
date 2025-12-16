import { BottomNavigation } from '../common/BottomNavigation';
import { AppHeader } from '../common/AppHeader';
import { useEffect, useState } from 'react';
import { getCompletedChallenges } from '../../lib/api';
import type { UserChallenge } from '../../types';
import { useChallengeStore } from '../../stores/useChallengeStore';

export function StatsScreen() {
  const [completedChallenges, setCompletedChallenges] = useState<UserChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const userTier = useChallengeStore((s) => s.userTier);

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

  // Calculate total stats from completed challenges
  const totalSteps = completedChallenges.reduce((sum, c) => sum + c.current_steps, 0);
  const totalDistance = ((totalSteps * 0.8) / 1000).toFixed(1);
  const totalCalories = Math.round(totalSteps * 0.04);
  const completedCount = completedChallenges.length;

  // Calculate total points earned (Pro users only)
  const totalPoints = userTier === 'pro' 
    ? completedChallenges
        .filter(c => !c.admin_challenge?.is_custom)
        .reduce((sum, c) => {
          const goalSteps = c.admin_challenge?.goal_steps || 0;
          let points = 0;
          if (goalSteps <= 5000) points = 5;
          else if (goalSteps <= 10000) points = 10;
          else if (goalSteps <= 15000) points = 15;
          else if (goalSteps <= 25000) points = 25;
          else points = 50;
          return sum + points;
        }, 0)
    : 0;

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B101B] text-gray-900 dark:text-white pb-20 font-sans">
      <AppHeader title="Statistics" showBackButton={true} />

      <main className="px-5 py-6 max-w-4xl mx-auto space-y-6">
        {/* Overall Summary */}
        <section className="bg-white dark:bg-[#151A25] border border-gray-200 dark:border-white/5 rounded-3xl p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
            <span>📊</span>
            <span>Your Stats</span>
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-[#0B101B] border border-gray-200 dark:border-white/5 rounded-2xl p-5 text-center">
              <div className="text-4xl font-black text-blue-600 dark:text-blue-400 mb-2">
                {totalSteps.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-white/60">Total Steps</div>
            </div>
            <div className="bg-gray-50 dark:bg-[#0B101B] border border-gray-200 dark:border-white/5 rounded-2xl p-5 text-center">
              <div className="text-4xl font-black text-green-600 dark:text-green-400 mb-2">
                {totalDistance}km
              </div>
              <div className="text-sm text-gray-600 dark:text-white/60">Distance</div>
            </div>
            <div className="bg-gray-50 dark:bg-[#0B101B] border border-gray-200 dark:border-white/5 rounded-2xl p-5 text-center">
              <div className="text-4xl font-black text-orange-600 dark:text-orange-400 mb-2">
                {totalCalories}
              </div>
              <div className="text-sm text-gray-600 dark:text-white/60">Calories</div>
            </div>
            <div className="bg-gray-50 dark:bg-[#0B101B] border border-gray-200 dark:border-white/5 rounded-2xl p-5 text-center">
              <div className="text-4xl font-black text-purple-600 dark:text-purple-400 mb-2">
                {completedCount}
              </div>
              <div className="text-sm text-gray-600 dark:text-white/60">Completed</div>
            </div>
          </div>

          {/* Points for Pro users */}
          {userTier === 'pro' && totalPoints > 0 && (
            <div className="mt-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-2 border-amber-300 dark:border-amber-500/30 rounded-2xl p-4 text-center">
              <div className="text-3xl font-black text-amber-900 dark:text-amber-400 mb-1">
                {totalPoints} Points
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-500 font-semibold">
                Total Points Earned
              </div>
            </div>
          )}
        </section>

        {/* Challenge History */}
        <section className="bg-white dark:bg-[#151A25] border border-gray-200 dark:border-white/5 rounded-3xl p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
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
                  className="bg-gray-50 dark:bg-[#0B101B] border border-gray-200 dark:border-white/5 rounded-2xl p-4 hover:border-gray-300 dark:hover:border-white/10 transition-all"
                >
                  <div className="flex items-start gap-4">
                    {/* Challenge Image */}
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-gray-200 dark:ring-white/10">
                      <img
                        src={challenge.admin_challenge?.image_url}
                        alt={challenge.admin_challenge?.title}
                        className="w-full h-full object-cover"
                      />
                      {/* Completion checkmark */}
                      <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>

                    {/* Challenge Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white text-base mb-1 truncate">
                        {challenge.admin_challenge?.title}
                      </h3>
                      
                      {/* Stats Row */}
                      <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-white/60 mb-2">
                        <span>{challenge.current_steps.toLocaleString()} steps</span>
                        <span>•</span>
                        <span>{((challenge.current_steps * 0.8) / 1000).toFixed(1)}km</span>
                        <span>•</span>
                        <span>{formatActiveTime(challenge)}</span>
                      </div>

                      {/* Date & Type */}
                      <div className="flex items-center gap-2">
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
