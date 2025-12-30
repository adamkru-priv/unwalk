import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';
import { badgesService, type Badge } from '../../services/badgesService';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { useState, useEffect } from 'react';
import { getUserGamificationStats } from '../../lib/gamification';
import type { UserGamificationStats } from '../../types';
import { ChallengeHistory } from '../stats/ChallengeHistory'; // 🎯 NEW: Import ChallengeHistory

export function BadgesScreen() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [gamificationStats, setGamificationStats] = useState<UserGamificationStats | null>(null);
  const [showHistory, setShowHistory] = useState(false); // 🎯 NEW: Challenge History collapsed by default

  // ✅ Read from store instead of loading
  const userProfile = useChallengeStore((s) => s.userProfile);
  const isGuest = userProfile?.is_guest ?? false;

  // Refresh data every time component is rendered (when navigating back to Rewards)
  useEffect(() => {
    loadBadgesData();
  }, [refreshKey, userProfile?.id]); // ✅ Reload when userProfile loads

  // Also refresh when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const loadBadgesData = async () => {
    setLoading(true);
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timed out')), 10000)
    );

    try {
      // ✅ Use profile from store, no need to fetch
      console.log('🔍 [BadgesScreen] Using profile from store:', { 
        isGuest,
        total_points: userProfile?.total_points 
      });

      // Only load badges for authenticated users
      if (!isGuest && userProfile?.id) {
        console.log('🔍 [BadgesScreen] Fetching badges from badgesService...');
        
        const badgesData = await Promise.race([
          badgesService.getBadges(),
          timeoutPromise
        ]) as Badge[];
        
        console.log('🔍 [BadgesScreen] Badges fetched, count:', badgesData.length);
        
        // Get total_points from user profile in store
        const userTotalPoints = userProfile?.total_points || 0;
        
        // ✅ Load gamification stats (XP & Level)
        const stats = await getUserGamificationStats();
        setGamificationStats(stats);

        // 🐛 DEBUG: Log all badges with their unlocked status
        console.log('🏆 [BadgesScreen] All badges:', badgesData.map(b => ({
          id: b.id,
          title: b.title,
          unlocked: b.unlocked,
          gradient: b.gradient
        })));

        setBadges(badgesData);
        
        console.log('✅ [BadgesScreen] Loaded badges with points:', userTotalPoints);
      } else {
        console.log('ℹ️ [BadgesScreen] Guest - skipping badges');
        // Clear badges if not authenticated
        setBadges([]);
        setGamificationStats(null);
      }
    } catch (error) {
      console.error('❌ [BadgesScreen] Failed to load badges:', error);
    } finally {
      console.log('🔍 [BadgesScreen] Setting loading to false');
      setLoading(false);
    }
  };

  const unlockedCount = badges.filter(b => b.unlocked).length;

  // Show locked screen for guests only
  const showLockedScreen = isGuest;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B101B] text-gray-900 dark:text-white pb-24 font-sans">
      {/* Header */}
      <AppHeader />

      <main className="px-5 pt-6 pb-6 space-y-6">
        
        {/* Guest users see locked screen */}
        {showLockedScreen ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
            <div className="relative mb-8">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
                <div className="text-6xl">🏆</div>
              </div>
              <div className="absolute -top-2 -right-2 w-16 h-16 bg-gray-900/90 backdrop-blur-md border-2 border-blue-500/50 rounded-full flex items-center justify-center shadow-2xl">
                <div className="text-2xl">🔒</div>
              </div>
            </div>

            <h2 className="text-2xl font-black text-white mb-3">
              Unlock Rewards
            </h2>
            
            <p className="text-white/60 text-sm leading-relaxed mb-6 max-w-sm">
              {isGuest 
                ? 'Sign up to unlock achievements, earn badges, and track your progress.'
                : 'Sign in to unlock achievements, earn badges, and track your progress.'
              }
            </p>

            <div className="bg-[#151A25] border border-white/10 rounded-2xl p-5 mb-6 max-w-sm">
              <div className="space-y-3 text-left">
                <div className="flex items-start gap-3">
                  <div className="text-2xl mt-0.5">🎖️</div>
                  <div>
                    <div className="text-white font-semibold text-sm mb-1">Unlock Badges</div>
                    <div className="text-white/50 text-xs">Earn achievements for your accomplishments</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl mt-0.5">⭐</div>
                  <div>
                    <div className="text-white font-semibold text-sm mb-1">Collect Points</div>
                    <div className="text-white/50 text-xs">Accumulate points as you progress</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl mt-0.5">📊</div>
                  <div>
                    <div className="text-white font-semibold text-sm mb-1">Track Achievements</div>
                    <div className="text-white/50 text-xs">See your complete progress history</div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                // Reuse the Team guest flow: send user to Profile to sign up/sign in
                // (AccountSection contains auth entry points)
                useChallengeStore.getState().setCurrentScreen('profile');
              }}
              className="w-full max-w-sm bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-4 rounded-2xl font-bold text-base transition-all shadow-lg shadow-blue-500/20"
            >
              Sign Up Free
            </button>

            <p className="text-white/40 text-xs mt-4">
              Unlock badges, points & achievements
            </p>
          </div>
        ) : (
          <>
            {/* Hero Header with XP & Level */}
            <div className="text-center">
              <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-1">
                Your Rewards
              </h1>
              {gamificationStats ? (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-white/50">
                  <span>{unlockedCount}/{badges.length} badges</span>
                  <span>•</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">Level {gamificationStats.level}</span>
                  <span>•</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">{gamificationStats.xp} XP</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-white/50">
                  <span>{unlockedCount}/{badges.length} badges</span>
                </div>
              )}
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="text-gray-500 dark:text-white/50 text-sm mt-3">Loading badges...</p>
              </div>
            ) : (
              <>
                {/* BADGES GRID */}
                <section>
                  <div className="grid grid-cols-3 gap-4">
                    {badges.map((badge) => {
                      // Map gradient string to actual Tailwind classes
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
                        `bg-gradient-to-br ${badge.gradient}` // fallback
                        : '';

                      return (
                        <button
                          key={badge.id}
                          className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-[#151A25] border border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-[#1A1F2E] transition-all group"
                        >
                          {/* Badge Circle */}
                          <div className="relative">
                            <div
                              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
                                badge.unlocked
                                  ? gradientClass
                                  : 'bg-gray-100 dark:bg-[#0B101B] border-2 border-gray-300 dark:border-white/10'
                              }`}
                            >
                              {/* Icon */}
                              <div className={`text-2xl ${!badge.unlocked && 'grayscale opacity-30'}`}>
                                {badge.icon}
                              </div>

                              {/* Lock icon for locked badges */}
                              {!badge.unlocked && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <svg className="w-5 h-5 text-gray-400 dark:text-white/20" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2-2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Title */}
                          <div className={`text-xs font-bold text-center leading-tight ${
                            badge.unlocked ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-white/40'
                          }`}>
                            {badge.title}
                          </div>

                          {/* Description */}
                          <div className={`text-[10px] leading-snug text-center h-8 flex items-center ${
                            badge.unlocked ? 'text-gray-500 dark:text-white/50' : 'text-gray-400 dark:text-white/30'
                          }`}>
                            {badge.description}
                          </div>

                          {/* Points badge */}
                          {badge.unlocked && (
                            <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                              +{badge.points}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* INFO BOX */}
                <section>
                  <div className="bg-white dark:bg-[#151A25] border border-gray-200 dark:border-white/5 rounded-2xl p-5 text-center">
                    <div className="text-2xl mb-2">✨</div>
                    <p className="text-sm text-gray-600 dark:text-white/60 leading-relaxed">
                      Complete challenges and stay active to unlock more badges and earn points
                    </p>
                  </div>
                </section>

                {/* 🎯 NEW: Challenge History - moved from ProfileScreen */}
                <section>
                  <div className="bg-white dark:bg-[#151A25] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="w-full px-5 py-4 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Challenge History</h2>
                        <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">Completed challenges & XP earned</p>
                      </div>
                      <svg className={`w-5 h-5 text-gray-400 transition-transform ${showHistory ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showHistory && (
                      <div className="border-t border-gray-200 dark:border-white/5">
                        <ChallengeHistory embedded={true} />
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation currentScreen="home" />
    </div>
  );
}
