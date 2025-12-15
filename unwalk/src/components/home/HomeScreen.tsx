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
  const [currentSlide, setCurrentSlide] = useState(0); // 0 = SOLO, 1 = SOCIAL
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  
  const activeUserChallenge = useChallengeStore((s) => s.activeUserChallenge);
  const pausedChallenges = useChallengeStore((s) => s.pausedChallenges);
  const userTier = useChallengeStore((s) => s.userTier);
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

  // Format active time for any challenge (not just active one)
  const formatChallengeActiveTime = (challenge: UserChallenge) => {
    const totalSeconds = challenge.active_time_seconds || 0;
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return '< 1m';
    }
  };

  const handleResumeChallenge = (challenge: any) => {
    if (confirm(`▶️ Resume "${challenge.admin_challenge?.title}"?\n\nYour progress: ${calculateProgressForChallenge(challenge)}%`)) {
      resumeChallenge(challenge);
      setCurrentScreen('dashboard');
    }
  };

  const handleSoloClick = () => {
    if (activeUserChallenge) {
      setCurrentScreen('dashboard');
    } else {
      // Open library in menu mode (2 boxes: Browse Challenges & Create Custom)
      setCurrentScreen('library');
    }
  };

  // Touch handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe && currentSlide === 0) {
      setCurrentSlide(1); // Swipe to SOCIAL
    }
    if (isRightSwipe && currentSlide === 1) {
      setCurrentSlide(0); // Swipe to SOLO
    }
  };

  return (
    <div 
      className="min-h-screen bg-gray-50 dark:bg-[#0B101B] text-gray-900 dark:text-white pb-24 font-sans selection:bg-blue-500/30"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <AppHeader />

      {/* Celebration Modal */}
      {selectedCompletedChallenge && (
        <CelebrationModal
          challenge={selectedCompletedChallenge}
          onClaim={handleClaimSuccess}
        />
      )}

      <main className="pt-6 pb-6 space-y-5">
        
        {/* Hero Header */}
        <div className="text-center mb-2 px-5">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-1">
            Let's get moving
          </h1>
          <p className="text-sm text-gray-600 dark:text-white/50">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        {/* COMPLETED CHALLENGES TO CLAIM - Top priority! */}
        {unclaimedChallenges.length > 0 && (
          <section>
            <div className="bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 border-y border-emerald-300 dark:border-emerald-500/30 py-4 px-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl"></div>
              
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2 relative z-10">
                <span className="animate-bounce">🎁</span>
                <span>Reward Waiting!</span>
              </h2>
              
              <div className="space-y-2 relative z-10">
                {unclaimedChallenges.map((challenge) => (
                  <button
                    key={challenge.id}
                    onClick={() => setSelectedCompletedChallenge(challenge)}
                    className="w-full bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl p-3 transition-all group flex items-center gap-3 text-left"
                  >
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 ring-2 ring-emerald-500/50">
                      <img
                        src={challenge.admin_challenge?.image_url}
                        alt={challenge.admin_challenge?.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm truncate">
                        {challenge.admin_challenge?.title}
                      </h3>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        Tap to claim →
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* HERO CAROUSEL - SOLO & SOCIAL CHALLENGES - Main attraction! */}
        <section className="relative">
          <div className="overflow-hidden">
            <div 
              className="flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${currentSlide * 85}%)` }}
            >
              {/* SOLO CHALLENGE CARD - Large Hero */}
              <div className="w-[85%] flex-shrink-0 pl-5 pr-3">
                <div
                  onClick={handleSoloClick}
                  className="relative aspect-[3/4] rounded-3xl overflow-hidden cursor-pointer group border-2 border-gray-200 dark:border-white/10 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all shadow-xl"
                >
                  {activeUserChallenge ? (
                    // Has active challenge - show challenge image
                    <>
                      <img
                        src={activeUserChallenge.admin_challenge?.image_url}
                        alt={activeUserChallenge.admin_challenge?.title}
                        className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                        style={{ 
                          filter: activeUserChallenge.admin_challenge?.is_image_hidden 
                            ? `blur(${Math.max(0, 20 - (calculateProgress() * 0.2))}px)` 
                            : 'none'
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/20 to-gray-900/60 dark:from-[#0B101B]/90 dark:via-[#0B101B]/20 dark:to-[#0B101B]/60" />
                      
                      <div className="absolute inset-0 p-6 flex flex-col justify-between">
                        {/* Top - Label & Badge */}
                        <div className="flex items-start justify-between">
                          <div className="text-xs font-bold text-blue-400 uppercase tracking-wide">Solo</div>
                          <span className="bg-blue-500 text-white text-xs font-black px-3 py-1.5 rounded-full animate-pulse">
                            ACTIVE
                          </span>
                        </div>
                        
                        {/* Bottom - Info */}
                        <div>
                          <h3 className="text-2xl font-black text-white leading-tight mb-3 line-clamp-2">
                            {activeUserChallenge.admin_challenge?.title}
                          </h3>
                          <div className="text-sm text-white/80 mb-3">
                            {activeUserChallenge.current_steps.toLocaleString()} / {activeUserChallenge.admin_challenge?.goal_steps.toLocaleString()} steps
                          </div>
                          <div className="bg-white/20 rounded-full h-2 overflow-hidden mb-2">
                            <div
                              className="bg-white h-full rounded-full transition-all"
                              style={{ width: `${calculateProgress()}%` }}
                            />
                          </div>
                          <div className="text-white text-sm font-bold text-right">
                            {calculateProgress()}%
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    // No active challenge - show generic solo image
                    <>
                      {/* Beautiful mountain/nature hiking image */}
                      <img
                        src="https://images.unsplash.com/photo-1551632811-561732d1e306?w=1200&auto=format&fit=crop&q=80"
                        alt="Solo walking adventure"
                        className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/95 via-indigo-600/40 to-blue-500/30" />
                      
                      <div className="absolute inset-0 p-6 flex flex-col justify-between">
                        {/* Top - Label & Badge */}
                        <div className="flex items-start justify-between">
                          <div className="text-xs font-bold text-blue-200 uppercase tracking-wide">Solo</div>
                          <div className="bg-blue-500/90 backdrop-blur-sm text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg">
                            60+ ROUTES
                          </div>
                        </div>
                        
                        {/* Middle - Title */}
                        <div className="flex-1 flex items-center justify-center">
                          <h3 className="text-4xl font-black text-white text-center leading-tight uppercase drop-shadow-2xl">
                            Move for<br />Yourself
                          </h3>
                        </div>
                        
                        {/* Bottom - CTA */}
                        <div className="flex items-center justify-between text-white text-sm font-bold">
                          <span>Start challenge</span>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* SOCIAL CHALLENGE CARD - Large Hero */}
              <div className="w-[85%] flex-shrink-0 pr-5 pl-3">
                <div
                  onClick={() => setCurrentScreen('team')}
                  className="relative aspect-[3/4] rounded-3xl overflow-hidden cursor-pointer group border-2 border-gray-200 dark:border-white/10 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all shadow-xl"
                >
                  {/* Dynamic group fitness/friends running together */}
                  <img
                    src="https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1200&auto=format&fit=crop&q=80"
                    alt="Social group activity"
                    className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/95 via-teal-600/40 to-cyan-500/30" />
                  
                  <div className="absolute inset-0 p-6 flex flex-col justify-between">
                    {/* Top - Label */}
                    <div className="flex items-start justify-between">
                      <div className="text-xs font-bold text-emerald-200 uppercase tracking-wide">Social</div>
                      {teamMembers.filter(m => m.hasActiveChallenge).length > 0 && (
                        <div className="bg-emerald-500/90 backdrop-blur-sm text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg">
                          {teamMembers.filter(m => m.hasActiveChallenge).length} ACTIVE
                        </div>
                      )}
                    </div>
                    
                    {/* Middle - Title */}
                    <div className="flex-1 flex items-center justify-center">
                      <h3 className="text-4xl font-black text-white text-center leading-tight uppercase drop-shadow-2xl">
                        Move a<br />Friend
                      </h3>
                    </div>
                    
                    {/* Bottom - CTA */}
                    <div className="flex items-center justify-between text-white text-sm font-bold">
                      <span>{teamMembers.filter(m => m.hasActiveChallenge).length > 0 ? 'View team' : 'Invite friends'}</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Carousel dots indicator */}
          <div className="flex justify-center gap-2 mt-4">
            <button
              onClick={() => setCurrentSlide(0)}
              className={`h-2 rounded-full transition-all ${
                currentSlide === 0 
                  ? 'w-8 bg-blue-500' 
                  : 'w-2 bg-gray-300 dark:bg-white/20'
              }`}
              aria-label="View Solo"
            />
            <button
              onClick={() => setCurrentSlide(1)}
              className={`h-2 rounded-full transition-all ${
                currentSlide === 1 
                  ? 'w-8 bg-emerald-500' 
                  : 'w-2 bg-gray-300 dark:bg-white/20'
              }`}
              aria-label="View Social"
            />
          </div>
        </section>

        {/* TODAY'S ACTIVITY - Minimized & Compact */}
        <section className="px-5">
          <div className="bg-white dark:bg-[#151A25] border border-gray-200 dark:border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-black text-gray-900 dark:text-white">{todaySteps.toLocaleString()}</div>
                <div className="text-xs text-gray-500 dark:text-white/60 uppercase tracking-wide font-bold">steps</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 dark:text-white/50">Daily Goal</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">{dailyGoalProgress}%</div>
              </div>
            </div>
            <div className="mt-3">
              <div className="bg-gray-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500" 
                  style={{ width: `${dailyGoalProgress}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* PAUSED CHALLENGES - Modern grid - ONLY FOR PRO USERS */}
        {userTier === 'pro' && pausedChallenges.length > 0 && (
          <section className="px-5">
            <h2 className="text-xs font-bold text-gray-500 dark:text-white/60 mb-3 uppercase tracking-wider flex items-center gap-2">
              <span>⏸</span>
              <span>Paused Challenges</span>
            </h2>
            
            <div className="grid grid-cols-2 gap-3">
              {pausedChallenges.map((challenge) => (
                <div
                  key={challenge.id}
                  onClick={() => handleResumeChallenge(challenge)}
                  className="relative aspect-[4/5] rounded-2xl overflow-hidden cursor-pointer group border-2 border-gray-200 dark:border-white/10 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all"
                >
                  {/* Background Image - blurred */}
                  <img
                    src={challenge.admin_challenge?.image_url}
                    alt={challenge.admin_challenge?.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ filter: 'blur(8px)' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/95 via-gray-900/40 to-gray-900/60 dark:from-[#0B101B]/95 dark:via-[#0B101B]/40 dark:to-[#0B101B]/60" />
                  
                  <div className="absolute inset-0 p-4 flex flex-col justify-between">
                    {/* Top - Type Badge & Time */}
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        {challenge.assigned_by ? (
                          <span className="bg-emerald-500/80 backdrop-blur-sm text-white text-[10px] font-black px-2 py-1 rounded-full border border-emerald-400/50 inline-block">
                            SOCIAL
                          </span>
                        ) : (
                          <span className="bg-blue-500/80 backdrop-blur-sm text-white text-[10px] font-black px-2 py-1 rounded-full border border-blue-400/50 inline-block">
                            SOLO
                          </span>
                        )}
                        <div className="flex items-center gap-1 text-white/70 text-[10px]">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{formatChallengeActiveTime(challenge)}</span>
                        </div>
                      </div>
                      <span className="text-white text-xs font-bold">
                        {calculateProgressForChallenge(challenge)}%
                      </span>
                    </div>
                    
                    {/* Bottom - Info */}
                    <div>
                      <h3 className="text-sm font-bold text-white leading-tight mb-3 line-clamp-2">
                        {challenge.admin_challenge?.title}
                      </h3>
                      
                      <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white text-xs font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1.5">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                        <span>Resume</span>
                      </button>
                    </div>
                  </div>
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
