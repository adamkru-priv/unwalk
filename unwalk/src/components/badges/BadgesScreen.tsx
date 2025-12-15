import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';
import { badgesService, authService, type Badge } from '../../lib/auth';
import { useState, useEffect } from 'react';

export function BadgesScreen() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [userTier, setUserTier] = useState<'basic' | 'pro'>('basic');
  const [refreshKey, setRefreshKey] = useState(0);

  // Refresh data every time component is rendered (when navigating back to Rewards)
  useEffect(() => {
    loadBadgesData();
  }, [refreshKey]); // Reload when refreshKey changes

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
    try {
      // Always fetch fresh profile data
      const profile = await authService.getUserProfile();
      const guestStatus = profile?.is_guest ?? false;
      const tier = profile?.tier ?? 'basic';
      
      console.log('🔍 [BadgesScreen] Fresh profile data:', { guestStatus, tier });
      
      setIsGuest(guestStatus);
      setUserTier(tier);

      // Only load badges if PRO user
      if (!guestStatus && tier === 'pro') {
        const [badgesData, points] = await Promise.all([
          badgesService.getBadges(),
          badgesService.getTotalPoints(),
        ]);

        setBadges(badgesData);
        setTotalPoints(points);
      } else {
        // Clear badges if not PRO
        setBadges([]);
        setTotalPoints(0);
      }
    } catch (error) {
      console.error('Failed to load badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const unlockedCount = badges.filter(b => b.unlocked).length;

  // Show locked screen for guests OR basic users (only PRO can access)
  const showLockedScreen = isGuest || userTier !== 'pro';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B101B] text-gray-900 dark:text-white pb-24 font-sans">
      {/* Header */}
      <AppHeader />

      <main className="px-5 pt-6 pb-6 max-w-md mx-auto space-y-6">
        
        {/* Guest users AND basic users see locked screen */}
        {showLockedScreen ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
            <div className="relative mb-8">
              <div className="w-32 h-32 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-full flex items-center justify-center">
                <div className="text-6xl">🏆</div>
              </div>
              <div className="absolute -top-2 -right-2 w-16 h-16 bg-gray-900/90 backdrop-blur-md border-2 border-yellow-500/50 rounded-full flex items-center justify-center shadow-2xl">
                <div className="text-2xl">🔒</div>
              </div>
            </div>

            <h2 className="text-2xl font-black text-white mb-3">
              Unlock Rewards
            </h2>
            
            <p className="text-white/60 text-sm leading-relaxed mb-6 max-w-sm">
              {isGuest 
                ? 'Sign up and upgrade to PRO to unlock achievements, earn badges, and track your progress.'
                : 'Upgrade to PRO to unlock achievements, earn badges, and track your progress with our rewards system.'
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
                // Navigate to pricing/upgrade screen
                // This would need to be implemented in your navigation system
                alert('Upgrade to PRO feature - redirect to pricing');
              }}
              className="w-full max-w-sm bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-6 py-4 rounded-2xl font-bold text-base transition-all shadow-lg shadow-amber-500/20"
            >
              Upgrade to PRO
            </button>

            <p className="text-white/40 text-xs mt-4">
              Unlock badges, points & achievements
            </p>
          </div>
        ) : (
          <>
            {/* Hero Header with Points */}
            <div className="text-center">
              <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-1">
                Your Rewards
              </h1>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-white/50">
                <span>{unlockedCount}/{badges.length} badges</span>
                <span>•</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">{totalPoints} points</span>
              </div>
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
                    {badges.map((badge) => (
                      <button
                        key={badge.id}
                        className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-[#151A25] border border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-[#1A1F2E] transition-all group"
                      >
                        {/* Badge Circle */}
                        <div className="relative">
                          <div
                            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                              badge.unlocked
                                ? `bg-gradient-to-br ${badge.gradient} shadow-lg`
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
                                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
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
                    ))}
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
              </>
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation currentScreen="badges" />
    </div>
  );
}
