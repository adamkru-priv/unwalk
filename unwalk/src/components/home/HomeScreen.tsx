import { useChallengeStore } from '../../stores/useChallengeStore';
import { useState, useEffect } from 'react';
import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';
import type { UserChallenge } from '../../types';
import { HeroHeader } from './sections/HeroHeader';
import { CompletedChallengesList } from './sections/CompletedChallengesList';
import { ChallengeCarousel } from './sections/ChallengeCarousel';
import { PausedChallengesGrid } from './sections/PausedChallengesGrid';
import { ModalManager } from './modals/ModalManager';
import { useHomeData } from './hooks/useHomeData';
import { useGamification } from './hooks/useGamification';
import { useHealthKitSync } from './hooks/useHealthKitSync';
import { useHealthKit } from '../../hooks/useHealthKit'; // 🎯 FIX: Import from correct location

export function HomeScreen() {
  const [selectedCompletedChallenge, setSelectedCompletedChallenge] = useState<UserChallenge | null>(null);
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const [showSoloSelectModal, setShowSoloSelectModal] = useState(false); // 🎯 NEW: Solo challenge selection
  const [showTeamSelectModal, setShowTeamSelectModal] = useState(false); // 🎯 NEW: Team challenge selection
  const [showInviteMoreModal, setShowInviteMoreModal] = useState(false);
  const [inviteMoreData, setInviteMoreData] = useState<{
    challengeId: string;
    challengeTitle: string;
    alreadyInvitedUserIds: string[];
  } | null>(null);

  // Store state
  const activeUserChallenge = useChallengeStore((s) => s.activeUserChallenge);
  const pausedChallenges = useChallengeStore((s) => s.pausedChallenges);
  const userProfile = useChallengeStore((s) => s.userProfile);
  const dailyStepGoal = useChallengeStore((s) => s.dailyStepGoal); // 🎯 NEW: Get daily step goal from store
  const todaySteps = useChallengeStore((s) => s.todaySteps); // 🎯 NEW: Read from global store
  const resumeChallenge = useChallengeStore((s) => s.resumeChallenge);
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);
  const setActiveChallenge = useChallengeStore((s) => s.setActiveChallenge);

  const isGuest = userProfile?.is_guest || false;

  // Custom hooks - extract complex logic
  const { unclaimedChallenges, teamChallenge, teamMembers, loadActiveChallenge, loadUnclaimedChallenges, loadTeamChallenges } = useHomeData();
  
  const {
    gamificationStats,
    showLevelUpModal,
    levelUpValue,
    closeLevelUpModal,
    handleQuestClaimed,
    handleChallengeClaimSuccess,
    nextStreakMilestone,
    reloadStats
  } = useGamification(isGuest, userProfile?.id);
  
  // 🎯 FIX: Sync BOTH Solo and Team challenges with HealthKit
  useHealthKitSync(activeUserChallenge, teamChallenge);

  // 🎯 Get sync function from HealthKit hook
  const { syncSteps } = useHealthKit();

  // 🎯 NEW: Refresh steps and streak when Home screen opens
  useEffect(() => {
    const initializeHomeScreen = async () => {
      // Sync steps from HealthKit
      await syncSteps();
      
      // Update user streak (awards bonus XP at milestones)
      if (!isGuest) {
        try {
          const { updateUserStreak } = await import('../../lib/gamification');
          const result = await updateUserStreak();
          if (result) {
            console.log(`🔥 Streak updated: ${result.current_streak} days`);
            if (result.streak_bonus_xp > 0) {
              console.log(`✨ Streak milestone! +${result.streak_bonus_xp} XP`);
            }
            // Reload gamification stats to show updated streak and XP
            await reloadStats();
          }
        } catch (error) {
          console.error('Failed to update streak:', error);
        }
      }
    };
    
    initializeHomeScreen();
  }, []); // Run once when component mounts

  // Challenge handlers
  const handleClaimSuccess = async () => {
    setSelectedCompletedChallenge(null);
    
    if (activeUserChallenge?.id === selectedCompletedChallenge?.id) {
      setActiveChallenge(null);
    }
    
    await loadUnclaimedChallenges();
    await loadActiveChallenge();
    await handleChallengeClaimSuccess();
  };

  const handleResumeChallenge = (challenge: UserChallenge) => {
    const progress = Math.round((challenge.current_steps / (challenge.admin_challenge?.goal_steps || 1)) * 100);
    if (confirm(`▶️ Resume "${challenge.admin_challenge?.title}"?\n\nYour progress: ${progress}%`)) {
      resumeChallenge(challenge);
      setCurrentScreen('dashboard');
    }
  };

  // Navigation handlers
  const handleSoloClick = () => {
    if (activeUserChallenge) {
      setCurrentScreen('dashboard');
    } else {
      // 🎯 NEW: Open Solo challenge selection modal instead of going to library
      setShowSoloSelectModal(true);
    }
  };

  const handleSoloSelectSuccess = async () => {
    await loadActiveChallenge();
    setShowSoloSelectModal(false);
  };

  const handleTeamSelectSuccess = async () => {
    await loadActiveChallenge();
    await loadTeamChallenges();
    setShowTeamSelectModal(false);
  };

  // 🎯 Handler for daily activity card - opens quest modal (Journey Modal)
  const handleDailyActivityClick = () => {
    setShowJourneyModal(true);
  };

  const handleInviteMoreClick = (challengeId: string, challengeTitle: string, alreadyInvitedUserIds: string[]) => {
    setInviteMoreData({ challengeId, challengeTitle, alreadyInvitedUserIds });
    setShowInviteMoreModal(true);
  };

  const handleInviteMoreSuccess = () => {
    setShowInviteMoreModal(false);
    // Refresh data if needed
  };

  // 🎯 NEW: Refresh data after challenge starts
  const handleChallengeStarted = async () => {
    console.log('🔄 Challenge started - refreshing data...');
    await loadActiveChallenge();
    await loadTeamChallenges(); // 🎯 FIX: Also reload team challenges!
  };

  // 🎯 NEW: Refresh data after challenge cancelled
  const handleChallengeCancelled = async () => {
    console.log('🔄 Challenge cancelled - refreshing data...');
    await loadActiveChallenge();
    await loadTeamChallenges(); // 🎯 FIX: Reload team challenges to clear pending state
  };

  // 🎯 NEW: Refresh data after challenge ends
  const handleChallengeEnded = async () => {
    console.log('🔄 Challenge ended - refreshing data...');
    await loadActiveChallenge();
    await loadTeamChallenges(); // 🎯 FIX: Reload team challenges to clear ended challenge
  };

  // Utility functions
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B101B] text-gray-900 dark:text-white pb-24 font-sans selection:bg-blue-500/30">
      <AppHeader />

      {/* Centralized Modal Management */}
      <ModalManager
        selectedCompletedChallenge={selectedCompletedChallenge}
        onClaimSuccess={handleClaimSuccess}
        showLevelUpModal={showLevelUpModal}
        levelUpValue={levelUpValue}
        onCloseLevelUp={closeLevelUpModal}
        showJourneyModal={showJourneyModal}
        onCloseJourney={() => setShowJourneyModal(false)}
        currentStreak={gamificationStats?.current_streak || 0}
        longestStreak={gamificationStats?.longest_streak || 0}
        nextMilestone={nextStreakMilestone}
        onQuestClaimed={handleQuestClaimed}
        showSoloSelectModal={showSoloSelectModal}
        showTeamSelectModal={showTeamSelectModal}
        onCloseSoloSelect={() => setShowSoloSelectModal(false)}
        onCloseTeamSelect={() => setShowTeamSelectModal(false)}
        onSoloSelectSuccess={handleSoloSelectSuccess}
        onTeamSelectSuccess={handleTeamSelectSuccess}
        showInviteMoreModal={showInviteMoreModal}
        onCloseInviteMore={() => setShowInviteMoreModal(false)}
        onInviteMoreSuccess={handleInviteMoreSuccess}
        inviteMoreData={inviteMoreData}
        isGuest={isGuest}
      />

      <main className="pt-6 pb-6 space-y-5">
        <HeroHeader 
          xp={gamificationStats?.xp} 
          level={gamificationStats?.level}
          onProgressClick={() => setShowJourneyModal(true)}
        />
        
        <CompletedChallengesList
          challenges={unclaimedChallenges}
          isGuest={isGuest}
          onChallengeClick={setSelectedCompletedChallenge}
        />

        <ChallengeCarousel
          soloChallenge={activeUserChallenge}
          teamChallenge={teamChallenge}
          teamMembers={teamMembers}
          progress={calculateProgress()}
          currentStreak={gamificationStats?.current_streak || 0}
          xpReward={activeUserChallenge?.admin_challenge?.points || 0}
          todaySteps={todaySteps}
          dailyStepGoal={dailyStepGoal || 10000} // 🎯 NEW: Pass daily step goal (default 10,000)
          onSoloClick={handleSoloClick}
          onTeamClick={() => setShowTeamSelectModal(true)} // 🎯 FIX: Use new Team selection modal
          onDailyActivityClick={handleDailyActivityClick}
          onInviteMoreClick={handleInviteMoreClick}
          onChallengeStarted={handleChallengeStarted}
          onChallengeCancelled={handleChallengeCancelled}
          onChallengeEnded={handleChallengeEnded}
        />

        <PausedChallengesGrid
          challenges={pausedChallenges}
          isGuest={isGuest}
          onResumeChallenge={handleResumeChallenge}
          formatActiveTime={formatChallengeActiveTime}
          calculateProgress={calculateProgressForChallenge}
        />
      </main>

      <BottomNavigation currentScreen="home" />
    </div>
  );
}
