import { useState, useEffect } from 'react';
import { getUserGamificationStats, getNextStreakMilestone } from '../../../lib/gamification';
import type { UserGamificationStats } from '../../../types';

/**
 * Hook for managing gamification stats and level-up logic
 * Handles: XP, level, streaks, level-up detection
 */
export function useGamification(isGuest: boolean, userId?: string) {
  const [gamificationStats, setGamificationStats] = useState<UserGamificationStats | null>(null);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [levelUpValue, setLevelUpValue] = useState(1);

  const loadGamificationStats = async () => {
    if (isGuest) return; // Only for Pro users
    
    try {
      const stats = await getUserGamificationStats();
      setGamificationStats(stats);
    } catch (error) {
      console.error('Failed to load gamification stats:', error);
    }
  };

  useEffect(() => {
    loadGamificationStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(loadGamificationStats, 30 * 1000);
    return () => clearInterval(interval);
  }, [isGuest, userId]);

  const handleQuestClaimed = async (xpEarned: number) => {
    console.log(`🎉 Quest claimed! +${xpEarned} XP`);
    
    // 🎯 FIX: Wait a bit for backend to process the claim
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Reload stats
    const newStats = await getUserGamificationStats();
    if (newStats && gamificationStats) {
      console.log(`✅ Stats updated: ${gamificationStats.xp} → ${newStats.xp} XP`);
      
      // Check if leveled up
      if (newStats.level > gamificationStats.level) {
        setLevelUpValue(newStats.level);
        setShowLevelUpModal(true);
      }
      setGamificationStats(newStats);
    } else if (newStats) {
      console.log(`✅ Stats loaded: ${newStats.xp} XP, Level ${newStats.level}`);
      setGamificationStats(newStats);
    }
  };

  const handleChallengeClaimSuccess = async () => {
    if (isGuest) return;
    
    try {
      const newStats = await getUserGamificationStats();
      if (newStats && gamificationStats) {
        // Check if leveled up
        if (newStats.level > gamificationStats.level) {
          setLevelUpValue(newStats.level);
          setShowLevelUpModal(true);
        }
      }
      setGamificationStats(newStats);
      console.log('✅ [useGamification] Refreshed stats after claim:', newStats);
    } catch (error) {
      console.error('❌ [useGamification] Failed to refresh stats:', error);
    }
  };

  return {
    gamificationStats,
    showLevelUpModal,
    levelUpValue,
    closeLevelUpModal: () => setShowLevelUpModal(false),
    handleQuestClaimed,
    handleChallengeClaimSuccess,
    reloadStats: loadGamificationStats,
    nextStreakMilestone: gamificationStats 
      ? (() => {
          const milestone = getNextStreakMilestone(gamificationStats.current_streak);
          if (!milestone) return undefined;
          
          // Convert format to match JourneyModal expectations
          return {
            steps: milestone.milestone,
            title: `${milestone.milestone} Day Streak`,
            icon: '🔥'
          };
        })()
      : undefined
  };
}
