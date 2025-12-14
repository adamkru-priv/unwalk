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
  const dailyStepGoal = useChallengeStore((s) => s.dailyStepGoal);

  // Mock family members with their challenges - TODO: Get from API
  const [teamMembers] = useState([
    { 
      id: '1', 
      name: 'Mama', 
      avatar: '👩',
      hasActiveChallenge: true,
      challengeTitle: 'Walk to Paris',
      progress: 65,
      currentSteps: 6500,
      goalSteps: 10000,
      status: 'active' as const
    },
    { 
      id: '2', 
      name: 'Tata', 
      avatar: '👨',
      hasActiveChallenge: true,
      challengeTitle: 'Mountain Trek',
      progress: 32,
      currentSteps: 8000,
      goalSteps: 25000,
      status: 'active' as const
    },
    { 
      id: '3', 
      name: 'Kasia', 
      avatar: '👧',
      hasActiveChallenge: true,
      challengeTitle: 'Beach Walk',
      progress: 100,
      currentSteps: 5000,
      goalSteps: 5000,
      status: 'completed' as const
    },
  ]);

  // Mock today's stats - later from Health API
  const todaySteps = 7234;
  
  // Calculate daily goal progress
  const actualDailyGoal = dailyStepGoal || 10000;
  const dailyGoalProgress = Math.min(100, Math.round((todaySteps / actualDailyGoal) * 100));

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

  const calculateActiveTime = () => {
    if (!activeUserChallenge) return { days: 0, hours: 0, minutes: 0, totalSeconds: 0 };
    
    // Start with stored active time (time from previous sessions)
    let totalSeconds = activeUserChallenge.active_time_seconds || 0;
    
    // If challenge is currently active (not paused), add current session time
    if (activeUserChallenge.status === 'active' && activeUserChallenge.last_resumed_at) {
      const resumedAt = new Date(activeUserChallenge.last_resumed_at);
      const now = new Date();
      const currentSessionSeconds = Math.floor((now.getTime() - resumedAt.getTime()) / 1000);
      totalSeconds += currentSessionSeconds;
    }
    
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    return { days, hours, minutes, totalSeconds };
  };

  const formatActiveTime = () => {
    const { days, hours, minutes } = calculateActiveTime();
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const calculateDaysActive = () => {
    // Deprecated - keeping for compatibility
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

      <main className="px-5 pt-6 pb-6 max-w-md mx-auto space-y-5">
        
        {/* Hero Header */}
        <div className="text-center mb-2">
          <h1 className="text-3xl font-black text-white mb-1">
            Let's get moving
          </h1>
          <p className="text-sm text-white/50">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
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

        {/* MOVE FOR YOURSELF - Main Box #1 */}
        <section>
          {activeUserChallenge ? (
            // Has active challenge - show progress
            <div
              onClick={() => setCurrentScreen('dashboard')}
              className="relative aspect-[16/10] w-full rounded-3xl overflow-hidden shadow-2xl cursor-pointer group ring-1 ring-white/10"
            >
              {/* Background Image */}
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
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B101B] via-[#0B101B]/60 to-transparent" />

              {/* Content */}
              <div className="absolute inset-0 p-6 flex flex-col justify-between">
                {/* Top Right - ACTIVE Badge */}
                <div className="flex items-start justify-end">
                  <span className="bg-white text-gray-900 text-xs font-black px-3 py-1.5 rounded-full shadow-lg animate-pulse">
                    ACTIVE
                  </span>
                </div>
                
                {/* Bottom Content */}
                <div>
                  <h3 className="text-2xl font-bold text-white leading-tight mb-2">
                    {activeUserChallenge.admin_challenge?.title}
                  </h3>
                  
                  <div className="flex items-center gap-3 text-xs text-white/70 mb-3">
                    <span>{formatActiveTime()}</span>
                    <span>•</span>
                    <span>{activeUserChallenge.current_steps.toLocaleString()} / {activeUserChallenge.admin_challenge?.goal_steps.toLocaleString()} steps</span>
                  </div>

                  {/* Progress Bar with Percentage */}
                  <div className="space-y-2">
                    <div className="bg-white/20 rounded-full h-2 overflow-hidden backdrop-blur-sm">
                      <div
                        className="bg-white h-full rounded-full transition-all duration-1000"
                        style={{ width: `${calculateProgress()}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-end">
                      <span className="text-white text-sm font-bold">
                        {calculateProgress()}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // No active challenge - show CTA
            <div className="relative bg-gradient-to-br from-[#1A1F2E] to-[#151A25] border-2 border-white/10 rounded-3xl p-8 overflow-hidden group hover:border-blue-500/30 transition-all cursor-pointer"
                 onClick={() => setCurrentScreen('library')}>
              {/* Accent line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
              
              {/* Subtle gradient accent */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
              
              <div className="relative z-10">
                <div className="mb-6">
                  <div className="text-xs font-bold text-blue-400 mb-3 uppercase tracking-widest">Solo Challenge</div>
                  <h2 className="text-4xl font-black text-white mb-3 leading-none tracking-tight uppercase">
                    Move for<br />Yourself
                  </h2>
                  
                  <p className="text-white/60 text-sm">
                    Start your personal challenge
                  </p>
                </div>
                
                <button className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 group-hover:border-white/30">
                  <span>Browse Challenges</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* MOVE A FRIEND - Main Box #2 */}
        <section>
          {teamMembers.filter(m => m.hasActiveChallenge).length > 0 ? (
            // Has team challenges - show them
            <div className="bg-gradient-to-br from-[#1A1F2E] to-[#151A25] border-2 border-white/10 rounded-3xl p-6 relative overflow-hidden">
              {/* Accent line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
              
              {/* Subtle accent */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-3xl"></div>
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="text-xs font-bold text-emerald-400 mb-2 uppercase tracking-widest">Social Challenge</div>
                    <h2 className="text-3xl font-black text-white leading-none tracking-tight uppercase">
                      Move a Friend
                    </h2>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentScreen('team');
                    }}
                    className="text-white/60 hover:text-white text-xs font-bold transition-colors uppercase tracking-wider"
                  >
                    View All →
                  </button>
                </div>
                
                <div className="space-y-3">
                  {teamMembers.slice(0, 2).map((member) => (
                    <div 
                      key={member.id}
                      onClick={() => {
                        // Store selected member ID and navigate to team screen
                        sessionStorage.setItem('selectedMemberId', member.id);
                        setCurrentScreen('team');
                      }}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-lg border border-white/10">
                        {member.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-sm">{member.name}</h3>
                        <div className="text-xs text-white/50 truncate">{member.challengeTitle}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="h-full bg-white rounded-full transition-all" 
                              style={{ width: `${member.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-white/70 font-medium min-w-[35px] text-right">{member.progress}%</span>
                        </div>
                      </div>
                      {member.status === 'completed' && (
                        <div className="text-xl">✓</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // No team challenges - show CTA
            <div className="relative bg-gradient-to-br from-[#1A1F2E] to-[#151A25] border-2 border-white/10 rounded-3xl p-8 overflow-hidden group hover:border-emerald-500/30 transition-all cursor-pointer"
                 onClick={() => setCurrentScreen('team')}>
              {/* Accent line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
              
              {/* Subtle gradient accent */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-3xl"></div>
              
              <div className="relative z-10">
                <div className="mb-6">
                  <div className="text-xs font-bold text-emerald-400 mb-3 uppercase tracking-widest">Social Challenge</div>
                  <h2 className="text-4xl font-black text-white mb-3 leading-none tracking-tight uppercase">
                    Move a<br />Friend
                  </h2>
                  
                  <p className="text-white/60 text-sm">
                    Challenge friends & family together
                  </p>
                </div>
                
                <button className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 group-hover:border-white/30">
                  <span>Invite & Challenge</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* TODAY'S ACTIVITY - Simplified, less prominence */}
        <section className="pt-2">
          <h2 className="text-sm font-bold text-white/60 mb-3 px-1 uppercase tracking-wider">
            Today's Activity
          </h2>
          
          <div className="bg-[#151A25] border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-3xl font-bold text-white">{todaySteps.toLocaleString()}</div>
                <div className="text-xs text-white/60 mt-0.5">steps today</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-xl">
                👣
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">Daily Goal</span>
                <span className="text-white font-medium">{dailyGoalProgress}%</span>
              </div>
              <div className="bg-white/10 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500" 
                  style={{ width: `${dailyGoalProgress}%` }}
                />
              </div>
              <div className="text-right text-xs text-white/50">
                {(actualDailyGoal - todaySteps).toLocaleString()} steps to go
              </div>
            </div>
          </div>
        </section>

        {/* PAUSED CHALLENGES - Only show if exist */}
        {pausedChallenges.length > 0 && (
          <section className="pt-2">
            <h2 className="text-sm font-bold text-white/60 mb-3 px-1 uppercase tracking-wider">
              Paused Challenges
            </h2>
            
            <div className="space-y-2">
              {pausedChallenges.map((challenge) => (
                <div
                  key={challenge.id}
                  className="bg-[#151A25] border border-white/5 rounded-2xl p-4 flex items-center gap-3 opacity-75"
                >
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={challenge.admin_challenge?.image_url}
                      alt={challenge.admin_challenge?.title}
                      className="w-full h-full object-cover"
                      style={{ filter: 'blur(4px)' }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-sm truncate">
                      {challenge.admin_challenge?.title}
                    </h3>
                    <div className="text-xs text-white/50">
                      {calculateProgressForChallenge(challenge)}% complete
                    </div>
                  </div>

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
