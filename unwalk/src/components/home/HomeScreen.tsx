import { useChallengeStore } from '../../stores/useChallengeStore';
import { useEffect, useState } from 'react';
import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';
import { getActiveUserChallenge, updateChallengeProgress } from '../../lib/api';
import type { UserChallenge } from '../../types';
import { CelebrationModal } from './CelebrationModal';
import { supabase } from '../../lib/supabase';
import { getDeviceId } from '../../lib/deviceId';
import { HeroHeader } from './sections/HeroHeader';
import { CompletedChallengesList } from './sections/CompletedChallengesList';
import { HeroCarousel } from './sections/HeroCarousel';
import { TodayActivity } from './sections/TodayActivity';
import { PausedChallengesGrid } from './sections/PausedChallengesGrid';
import { useHealthKit } from '../../hooks/useHealthKit';

export function HomeScreen() {
  const [unclaimedChallenges, setUnclaimedChallenges] = useState<UserChallenge[]>([]);
  const [selectedCompletedChallenge, setSelectedCompletedChallenge] = useState<UserChallenge | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [teamActiveChallenges, setTeamActiveChallenges] = useState<any[]>([]);
  
  const activeUserChallenge = useChallengeStore((s) => s.activeUserChallenge);
  const pausedChallenges = useChallengeStore((s) => s.pausedChallenges);
  const userProfile = useChallengeStore((s) => s.userProfile);
  const userTier = useChallengeStore((s) => s.userTier);
  const resumeChallenge = useChallengeStore((s) => s.resumeChallenge);
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);
  const dailyStepGoal = useChallengeStore((s) => s.dailyStepGoal);
  const setActiveChallenge = useChallengeStore((s) => s.setActiveChallenge);

  // ✅ HealthKit integration - prawdziwe kroki z Apple Health!
  const { 
    isAvailable: healthKitAvailable, 
    isAuthorized: healthKitAuthorized,
    todaySteps: healthKitSteps, 
    requestPermission: requestHealthKitPermission,
    syncSteps,
    getSteps, // ✅ Added getSteps
    isNative
  } = useHealthKit();

  // Użyj prawdziwych kroków z HealthKit, fallback na mock dla web
  const todaySteps = isNative && healthKitAuthorized ? healthKitSteps : 7234;

  useEffect(() => {
    loadActiveChallenge();
    loadUnclaimedChallenges();
    loadTeamChallenges();
  }, []);

  // ✅ Request HealthKit permission gdy plugin zgłosi gotowość
  useEffect(() => {
    if (isNative && healthKitAvailable && !healthKitAuthorized) {
      console.log('🔐 [HomeScreen] Requesting HealthKit permission...');
      requestHealthKitPermission();
    }
  }, [isNative, healthKitAvailable, healthKitAuthorized, requestHealthKitPermission]);

  // ✅ Auto-sync kroków co 5 minut jeśli mamy dostęp do HealthKit
  useEffect(() => {
    if (isNative && healthKitAuthorized) {
      console.log('🔄 [HomeScreen] Starting auto-sync for HealthKit steps...');
      
      // Początkowa synchronizacja
      syncSteps();
      
      // Synchronizuj co 5 minut
      const interval = setInterval(() => {
        console.log('🔄 [HomeScreen] Auto-syncing steps...');
        syncSteps();
      }, 5 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [healthKitAuthorized, isNative]);

  // ✅ NEW: Sync active challenge progress with HealthKit
  useEffect(() => {
    if (isNative && healthKitAuthorized && activeUserChallenge) {
      const syncChallengeProgress = async () => {
        try {
          console.log('🔄 [HomeScreen] Syncing challenge progress with HealthKit...');
          const startDate = new Date(activeUserChallenge.started_at);
          const now = new Date();
          
          // Get total steps since challenge started
          const steps = await getSteps(startDate, now);
          console.log(`📊 [HomeScreen] Steps for challenge "${activeUserChallenge.admin_challenge?.title}": ${steps}`);
          
          // Only update if steps have increased
          if (steps > activeUserChallenge.current_steps) {
            console.log(`📈 [HomeScreen] Updating challenge progress: ${activeUserChallenge.current_steps} -> ${steps}`);
            
            // Update DB
            await updateChallengeProgress(activeUserChallenge.id, steps);
            
            // Update local store
            setActiveChallenge({
              ...activeUserChallenge,
              current_steps: steps
            });
            
            // Check for completion
            if (activeUserChallenge.admin_challenge?.goal_steps && steps >= activeUserChallenge.admin_challenge.goal_steps) {
               console.log('🎉 [HomeScreen] Challenge completed via HealthKit sync!');
               // Reload to trigger completion logic/modal
               loadActiveChallenge();
               loadUnclaimedChallenges();
            }
          }
        } catch (error) {
          console.error('❌ [HomeScreen] Failed to sync challenge progress:', error);
        }
      };

      // Sync immediately
      syncChallengeProgress();

      // And sync periodically
      const interval = setInterval(syncChallengeProgress, 2 * 60 * 1000); // Every 2 mins
      return () => clearInterval(interval);
    }
  }, [isNative, healthKitAuthorized, activeUserChallenge?.id, getSteps]);

  const loadActiveChallenge = async () => {
    try {
      const activeChallenge = await getActiveUserChallenge();
      if (activeChallenge) {
        setActiveChallenge(activeChallenge);
        console.log('✅ [HomeScreen] Loaded active challenge:', activeChallenge.admin_challenge?.title);
      }
    } catch (err) {
      console.error('Failed to load active challenge:', err);
    }
  };

  const loadUnclaimedChallenges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const deviceId = getDeviceId();
      
      if (!user) {
        console.log('No authenticated user');
        return;
      }
      
      const { data, error } = await supabase
        .from('user_challenges')
        .select(`
          *,
          admin_challenge:admin_challenges(*)
        `)
        .eq('status', 'active')
        .or(`user_id.eq.${user.id},device_id.eq.${deviceId}`)
        .order('started_at', { ascending: false });
      
      if (error) {
        console.error('Failed to load challenges:', error);
        return;
      }
      
      const completed = (data || []).filter(challenge => {
        const goalSteps = challenge.admin_challenge?.goal_steps || 0;
        const currentSteps = challenge.current_steps || 0;
        return currentSteps >= goalSteps && goalSteps > 0;
      });
      
      setUnclaimedChallenges(completed);
      console.log('✅ [HomeScreen] Loaded unclaimed challenges (at 100%):', completed.length);
    } catch (err) {
      console.error('Failed to load unclaimed challenges:', err);
    }
  };

  const loadTeamChallenges = async () => {
    console.log('👤 [HomeScreen] Team challenges disabled (Stage 2 feature)');
    setTeamActiveChallenges([]);
  };

  const handleClaimSuccess = () => {
    setSelectedCompletedChallenge(null);
    
    if (activeUserChallenge?.id === selectedCompletedChallenge?.id) {
      setActiveChallenge(null);
      console.log('✅ [HomeScreen] Cleared claimed challenge from active slot');
    }
    
    loadUnclaimedChallenges();
    loadActiveChallenge();
  };

  const calculateProgress = () => {
    if (!activeUserChallenge) return 0;
    return Math.round((activeUserChallenge.current_steps / (activeUserChallenge.admin_challenge?.goal_steps || 1)) * 100);
  };

  const calculateProgressForChallenge = (challenge: UserChallenge) => {
    return Math.round((challenge.current_steps / (challenge.admin_challenge?.goal_steps || 1)) * 100);
  };

  const formatChallengeActiveTime = (challenge: UserChallenge) => {
    const totalSeconds = challenge.active_time_seconds || 0;
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return '< 1m';
  };

  const handleResumeChallenge = (challenge: UserChallenge) => {
    if (confirm(`▶️ Resume "${challenge.admin_challenge?.title}"?\n\nYour progress: ${calculateProgressForChallenge(challenge)}%`)) {
      resumeChallenge(challenge);
      setCurrentScreen('dashboard');
    }
  };

  const handleSoloClick = () => {
    if (activeUserChallenge) {
      setCurrentScreen('dashboard');
    } else {
      setCurrentScreen('library');
    }
  };

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
      setCurrentSlide(1);
    }
    if (isRightSwipe && currentSlide === 1) {
      setCurrentSlide(0);
    }
  };

  return (
    <div 
      className="min-h-screen bg-gray-50 dark:bg-[#0B101B] text-gray-900 dark:text-white pb-24 font-sans selection:bg-blue-500/30"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <AppHeader />

      {selectedCompletedChallenge && (
        <CelebrationModal
          challenge={selectedCompletedChallenge}
          onClaim={handleClaimSuccess}
        />
      )}

      <main className="pt-6 pb-6 space-y-5">
        <HeroHeader date={new Date()} />
        
        <CompletedChallengesList
          challenges={unclaimedChallenges}
          userTier={userTier}
          onChallengeClick={setSelectedCompletedChallenge}
        />

        <HeroCarousel
          activeChallenge={activeUserChallenge}
          progress={calculateProgress()}
          currentSlide={currentSlide}
          teamActiveChallenges={teamActiveChallenges}
          onSoloClick={handleSoloClick}
          onTeamClick={() => setCurrentScreen('team')}
          onSlideChange={setCurrentSlide}
        />

        <TodayActivity
          todaySteps={todaySteps}
          dailyStepGoal={dailyStepGoal}
          isGuest={userProfile?.is_guest || false}
        />

        <PausedChallengesGrid
          challenges={pausedChallenges}
          userTier={userTier}
          onResumeChallenge={handleResumeChallenge}
          formatActiveTime={formatChallengeActiveTime}
          calculateProgress={calculateProgressForChallenge}
        />
      </main>

      <BottomNavigation currentScreen="home" />
    </div>
  );
}
