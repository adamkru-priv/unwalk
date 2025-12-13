import { useChallengeStore } from '../../stores/useChallengeStore';
import { useEffect, useState } from 'react';
import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';
import { getUnclaimedChallenges } from '../../lib/api';
import type { UserChallenge } from '../../types';
import { CelebrationModal } from './CelebrationModal';

export function HomeScreen() {
  const [unclaimedChallenges, setUnclaimedChallenges] = useState<UserChallenge[]>([]);
  const [selectedCompletedChallenge, setSelectedCompletedChallenge] = useState<UserChallenge | null>(null);
  const activeUserChallenge = useChallengeStore((s) => s.activeUserChallenge);
  const pausedChallenges = useChallengeStore((s) => s.pausedChallenges);
  const resumeChallenge = useChallengeStore((s) => s.resumeChallenge);
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);

  useEffect(() => {
    loadUnclaimedChallenges();
  }, []);

  const loadUnclaimedChallenges = async () => {
    try {
      const data = await getUnclaimedChallenges();
      setUnclaimedChallenges(data);
    } catch (err) {
      console.error('Failed to load unclaimed challenges:', err);
    }
  };

  const handleClaimSuccess = () => {
    setSelectedCompletedChallenge(null);
    loadUnclaimedChallenges(); // Refresh list
    setCurrentScreen('badges'); // Go to badges to see the new addition
  };

  const calculateProgress = () => {
    if (!activeUserChallenge) return 0;
    return Math.round((activeUserChallenge.current_steps / (activeUserChallenge.admin_challenge?.goal_steps || 1)) * 100);
  };

  const calculateProgressForChallenge = (challenge: any) => {
    return Math.round((challenge.current_steps / (challenge.admin_challenge?.goal_steps || 1)) * 100);
  };

  const calculateDaysActive = () => {
    if (!activeUserChallenge?.started_at) return 0;
    const startDate = new Date(activeUserChallenge.started_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleResumeChallenge = (challenge: any) => {
    if (confirm(`▶️ Resume "${challenge.admin_challenge?.title}"?\n\nYour progress: ${calculateProgressForChallenge(challenge)}%`)) {
      resumeChallenge(challenge);
      setCurrentScreen('dashboard');
    }
  };

  // Mock today's stats - later from Health API
  const todaySteps = 7234;

  return (
    <div className="min-h-screen bg-[#0B101B] text-white pb-24 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <AppHeader />

      {/* Celebration Modal */}
      {selectedCompletedChallenge && (
        <CelebrationModal
          challenge={selectedCompletedChallenge}
          onClaim={handleClaimSuccess}
        />
      )}

      <main className="px-5 pt-2 pb-6 max-w-md mx-auto space-y-8">
        
        {/* COMPLETED CHALLENGES TO CLAIM - Top priority! */}
        {unclaimedChallenges.length > 0 && (
          <section>
            <div className="bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border border-emerald-500/30 rounded-3xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl"></div>
              
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 relative z-10">
                <span className="animate-bounce">🎁</span>
                <span>Reward Waiting!</span>
              </h2>
              
              <div className="space-y-3 relative z-10">
                {unclaimedChallenges.map((challenge) => (
                  <button
                    key={challenge.id}
                    onClick={() => setSelectedCompletedChallenge(challenge)}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-3 transition-all group flex items-center gap-4 text-left"
                  >
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-emerald-500/50">
                      <img
                        src={challenge.admin_challenge?.image_url}
                        alt={challenge.admin_challenge?.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-sm truncate">
                        {challenge.admin_challenge?.title}
                      </h3>
                      <div className="text-xs text-emerald-400 font-medium mt-0.5">
                        Tap to claim reward →
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ACTIVE CHALLENGE CARD */}
        {activeUserChallenge ? (
          <section>
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-lg font-semibold text-white">Current Mission</h2>
              <span className="text-xs font-medium text-blue-400 bg-blue-400/10 px-2.5 py-1 rounded-full">
                {calculateProgress()}% Complete
              </span>
            </div>
            
            <div
              onClick={() => setCurrentScreen('dashboard')}
              className="relative aspect-[4/5] w-full rounded-[2rem] overflow-hidden shadow-2xl cursor-pointer group ring-1 ring-white/10"
            >
              {/* Background Image with blur effect */}
              <img
                src={activeUserChallenge.admin_challenge?.image_url}
                alt={activeUserChallenge.admin_challenge?.title}
                className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                style={{ 
                  filter: activeUserChallenge.admin_challenge?.is_image_hidden 
                    ? `blur(${Math.max(0, 30 - (calculateProgress() * 0.3))}px)` 
                    : 'none'
                }}
              />
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B101B] via-[#0B101B]/40 to-transparent opacity-90" />

              {/* Content */}
              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider">
                      {activeUserChallenge.admin_challenge?.category || 'Adventure'}
                    </span>
                    <span className="text-white/60 text-xs font-medium">Day {calculateDaysActive()}</span>
                  </div>
                  
                  <h3 className="text-3xl font-bold text-white leading-tight mb-2">
                    {activeUserChallenge.admin_challenge?.title}
                  </h3>
                  
                  <p className="text-white/70 text-sm line-clamp-2 mb-4">
                    {activeUserChallenge.admin_challenge?.description}
                  </p>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium text-white/80">
                      <span>{activeUserChallenge.current_steps.toLocaleString()} steps</span>
                      <span>{activeUserChallenge.admin_challenge?.goal_steps.toLocaleString()} goal</span>
                    </div>
                    <div className="bg-white/20 rounded-full h-2 overflow-hidden backdrop-blur-sm">
                      <div
                        className="bg-gradient-to-r from-blue-400 to-purple-500 h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${calculateProgress()}%` }}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="text-center text-white/40 text-xs font-medium group-hover:text-white/60 transition-colors">
                  Tap to view details
                </div>
              </div>
            </div>
          </section>
        ) : (
          /* EMPTY STATE - Redesigned */
          <section>
            <div className="bg-gradient-to-br from-[#1A1F2E] to-[#151925] border border-white/5 rounded-[2rem] p-8 text-center relative overflow-hidden shadow-2xl">
              {/* Decorative background elements */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-red-500 to-yellow-500 opacity-50" />
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-red-500/10 rounded-full blur-3xl"></div>
              
              <div className="relative z-10">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 ring-1 ring-white/10">
                  <span className="text-4xl">👟</span>
                </div>

                <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">
                  Time to Walk!
                </h2>
                <p className="text-gray-400 mb-8 leading-relaxed text-sm max-w-[260px] mx-auto">
                  Set a step goal and get moving. Challenge yourself to reach new limits today.
                </p>
                
                <button
                  onClick={() => setCurrentScreen('library')}
                  className="w-full bg-white text-[#0B101B] py-4 rounded-xl font-bold text-base transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
                >
                  <span>Pick a Challenge</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>

                <button
                  onClick={() => setCurrentScreen('team')}
                  className="mt-4 text-sm text-gray-500 hover:text-white transition-colors"
                >
                  Or invite friends first
                </button>
              </div>
            </div>
          </section>
        )}

        {/* STATS GRID - Modern Bento Style */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 px-1">Today's Activity</h2>
          
          <div className="grid grid-cols-1 gap-3">
             {/* Steps - Big Card */}
             <div className="bg-[#151A25] p-5 rounded-3xl border border-white/5 flex items-center justify-between relative overflow-hidden group hover:border-white/10 transition-colors">
                <div className="relative z-10">
                   <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Steps</div>
                   <div className="text-4xl font-bold text-white tracking-tight">{todaySteps.toLocaleString()}</div>
                   <div className="flex items-center gap-1.5 mt-2">
                     <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-500 w-[72%] rounded-full" />
                     </div>
                     <span className="text-xs text-gray-400 font-medium">72% of goal</span>
                   </div>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-2xl relative z-10 text-blue-400">
                  👣
                </div>
                {/* Decorative gradient blob */}
                <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-blue-500/10 transition-colors"></div>
             </div>
          </div>
        </section>

        {/* PAUSED CHALLENGES SECTION - Only for Pro users */}
        {pausedChallenges.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-400 mb-3 px-1 uppercase tracking-wider">
              Paused
            </h2>
            
            <div className="space-y-3">
              {pausedChallenges.map((challenge) => (
                <div
                  key={challenge.id}
                  className="bg-[#151A25] border border-white/5 rounded-2xl p-4 flex items-center gap-4 opacity-75 hover:opacity-100 transition-opacity"
                >
                  {/* Thumbnail */}
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 grayscale">
                    <img
                      src={challenge.admin_challenge?.image_url}
                      alt={challenge.admin_challenge?.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-sm truncate">
                      {challenge.admin_challenge?.title}
                    </h3>
                    <div className="text-xs text-gray-500">
                      {calculateProgressForChallenge(challenge)}% complete
                    </div>
                  </div>

                  {/* Resume Button */}
                  <button
                    onClick={() => handleResumeChallenge(challenge)}
                    className="text-xs font-bold text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Resume
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation currentScreen="home" />
    </div>
  );
}
