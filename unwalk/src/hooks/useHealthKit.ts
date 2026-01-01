import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { healthKitService } from '../services/healthKit.native';
import { useChallengeStore } from '../stores/useChallengeStore';
import { syncDailySteps, getTodayQuest, updateQuestProgress } from '../lib/gamification';
import { updateChallengeProgress, getActiveTeamChallenge } from '../lib/api'; // 🎯 FIX: Import getActiveTeamChallenge

export function useHealthKit() {
  const setHealthConnected = useChallengeStore((s) => s.setHealthConnected);
  const setTodaySteps = useChallengeStore((s) => s.setTodaySteps); // 🎯 NEW: Use global store
  const todaySteps = useChallengeStore((s) => s.todaySteps); // 🎯 NEW: Read from global store
  const activeUserChallenge = useChallengeStore((s) => s.activeUserChallenge); // 🎯 NEW: Get active challenge

  const [isAvailable, setIsAvailable] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initial setup and authorization check
  useEffect(() => {
    (async () => {
      try {
        console.log('🔍 Checking Health Connect availability...');
        const available = await healthKitService.isAvailable();
        console.log('✅ Health Connect available:', available);
        setIsAvailable(available);

        // 🎯 Only CHECK if authorized, don't REQUEST automatically
        if (Capacitor.isNativePlatform() && available) {
          // Check if we already have authorization (don't request it automatically)
          // User needs to click "Connect" button to request permissions
          setHealthConnected(false);
        } else {
          setHealthConnected(false);
        }
      } catch (error) {
        console.error('❌ Error initializing health kit:', error);
        setIsAvailable(false);
        setHealthConnected(false);
      }
    })();
  }, [setHealthConnected, setTodaySteps]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const granted = await healthKitService.requestAuthorization();
      setIsAuthorized(granted);
      setHealthConnected(granted);
      if (granted) {
        await syncSteps();
      }
      return granted;
    } finally {
      setIsLoading(false);
    }
  }, [setHealthConnected]);

  const syncSteps = useCallback(async (): Promise<number> => {
    if (!isAuthorized && isAvailable) {
      const granted = await requestPermission();
      if (!granted) return 0;
    }

    setIsLoading(true);
    try {
      // 🎯 Get TODAY'S steps (from beginning of day) - for Daily XP and Quests
      const todayStepsCount = await healthKitService.getTodaySteps();
      setTodaySteps(todayStepsCount);
      
      // Sync steps to backend and award Base XP
      try {
        await syncDailySteps(todayStepsCount);
        console.log(`✅ Synced ${todayStepsCount} steps → ${Math.floor(todayStepsCount / 1000)} Base XP`);
        
        // Update Daily Quest progress if quest is steps-based
        try {
          const quest = await getTodayQuest();
          if (quest && quest.quest_type === 'steps' && !quest.claimed) {
            await updateQuestProgress(quest.id, todayStepsCount);
            console.log(`✅ Updated Daily Quest progress: ${todayStepsCount} / ${quest.target_value} steps`);
          }
        } catch (questError) {
          console.error('Failed to update quest progress:', questError);
        }

        // 🎯 Update SOLO challenge progress - count steps SINCE challenge started
        if (activeUserChallenge?.id && activeUserChallenge?.started_at) {
          try {
            const challengeStartDate = new Date(activeUserChallenge.started_at);
            const now = new Date();
            
            // Get steps SINCE challenge started (not from beginning of day!)
            const challengeSteps = await healthKitService.getSteps(challengeStartDate, now);
            
            await updateChallengeProgress(activeUserChallenge.id, challengeSteps);
            console.log(`✅ Updated SOLO challenge progress: ${challengeSteps} steps (since ${challengeStartDate.toLocaleString()})`);
          } catch (challengeError) {
            console.error('Failed to update solo challenge progress:', challengeError);
          }
        }

        // 🎯 FIX: Update TEAM challenge progress - fetch and sync separately
        try {
          const teamChallenge = await getActiveTeamChallenge();
          if (teamChallenge?.id && teamChallenge?.started_at) {
            const challengeStartDate = new Date(teamChallenge.started_at);
            const now = new Date();
            
            // Get steps SINCE team challenge started
            const teamChallengeSteps = await healthKitService.getSteps(challengeStartDate, now);
            
            await updateChallengeProgress(teamChallenge.id, teamChallengeSteps);
            console.log(`✅ Updated TEAM challenge progress: ${teamChallengeSteps} steps (since ${challengeStartDate.toLocaleString()})`);
          }
        } catch (teamError) {
          console.error('Failed to update team challenge progress:', teamError);
        }
      } catch (error) {
        console.error('Failed to sync daily steps to backend:', error);
      }
      
      return todayStepsCount;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthorized, isAvailable, requestPermission, setTodaySteps, activeUserChallenge]);

  const getSteps = useCallback(
    async (startDate: Date, endDate: Date): Promise<number> => {
      if (!isAuthorized && isAvailable) {
        const granted = await requestPermission();
        if (!granted) return 0;
      }

      return healthKitService.getSteps(startDate, endDate);
    },
    [isAuthorized, isAvailable, requestPermission],
  );

  const getStepsHistory = useCallback(
    async (days: number): Promise<Array<{ date: string; steps: number }>> => {
      if (!isAuthorized && isAvailable) {
        const granted = await requestPermission();
        if (!granted) return [];
      }

      try {
        const history = [];
        const today = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
          
          const endDate = new Date(date);
          endDate.setHours(23, 59, 59, 999);
          
          const steps = await healthKitService.getSteps(date, endDate);
          history.push({
            date: date.toISOString().split('T')[0],
            steps
          });
        }
        
        return history;
      } catch (error) {
        console.error('Failed to get steps history:', error);
        return [];
      }
    },
    [isAuthorized, isAvailable, requestPermission],
  );

  return {
    isAvailable,
    isAuthorized,
    todaySteps,
    isLoading,
    isNative: Capacitor.isNativePlatform(),
    requestPermission,
    syncSteps,
    getSteps,
    getStepsHistory, // 🎯 NEW: Export steps history function
  };
}
