import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { healthKitService } from '../services/healthKit.native';
import { useChallengeStore } from '../stores/useChallengeStore';
import { getTodayQuest, updateQuestProgress } from '../lib/gamification'; // ✅ REMOVED: syncDailySteps import
import { updateChallengeProgress, getActiveTeamChallenge } from '../lib/api'; // 🎯 FIX: Import getActiveTeamChallenge

export function useHealthKit() {
  const setHealthConnected = useChallengeStore((s) => s.setHealthConnected);
  const setTodaySteps = useChallengeStore((s) => s.setTodaySteps);
  const todaySteps = useChallengeStore((s) => s.todaySteps);
  const activeUserChallenge = useChallengeStore((s) => s.activeUserChallenge);
  
  // 🎯 Use global state for authorization status (persisted in localStorage)
  const healthKitAuthorized = useChallengeStore((s) => s.healthKitAuthorized);
  const setHealthKitAuthorized = useChallengeStore((s) => s.setHealthKitAuthorized);

  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initial setup and authorization check
  useEffect(() => {
    (async () => {
      try {
        console.log('🔍 Checking Health Connect availability...');
        const available = await healthKitService.isAvailable();
        console.log('✅ Health available on', Capacitor.getPlatform() + ':', available);
        setIsAvailable(available);

        // ✅ Check authorization ONLY if we don't have it persisted
        if (Capacitor.isNativePlatform() && available) {
          // 🎯 FIX: iOS HealthKit can't reliably check authorization status
          // Once user grants permission, trust the persisted state
          if (!healthKitAuthorized) {
            // Only check native authorization if we don't have it persisted
            const authorized = await healthKitService.isAuthorized();
            console.log('✅ Health Connect authorization status:', authorized);
            
            if (authorized) {
              // If iOS says yes, save it
              setHealthKitAuthorized(true);
              setHealthConnected(true);
              await syncSteps();
            }
            // If iOS says no, don't override persisted state - user might have granted it before
          } else {
            // We have persisted authorization - trust it and sync
            console.log('✅ Using persisted Health authorization status:', healthKitAuthorized);
            setHealthConnected(true);
            await syncSteps();
          }
        } else {
          setHealthConnected(false);
        }
      } catch (error) {
        console.error('❌ Error initializing health kit:', error);
        setIsAvailable(false);
        setHealthConnected(false);
      }
    })();
  }, [setHealthConnected, setHealthKitAuthorized]); // healthKitAuthorized intentionally NOT in deps

  // 🎯 Function to recheck authorization status (for profile screen)
  const recheckAuthorization = useCallback(async () => {
    if (!isAvailable || !Capacitor.isNativePlatform()) return;
    
    try {
      // 🎯 FIX: Don't override persisted state - just refresh steps
      if (healthKitAuthorized) {
        console.log('🔄 Rechecked Health authorization: using persisted status =', healthKitAuthorized);
        setHealthConnected(true);
        
        // Refresh steps to show latest count
        const steps = await healthKitService.getTodaySteps();
        setTodaySteps(steps);
      } else {
        // Only check native if we don't have persisted authorization
        const authorized = await healthKitService.isAuthorized();
        console.log('🔄 Rechecked Health authorization from native:', authorized);
        
        if (authorized) {
          setHealthKitAuthorized(true);
          setHealthConnected(true);
          const steps = await healthKitService.getTodaySteps();
          setTodaySteps(steps);
        }
      }
    } catch (error) {
      console.error('❌ Error rechecking authorization:', error);
    }
  }, [isAvailable, healthKitAuthorized, setHealthConnected, setHealthKitAuthorized, setTodaySteps]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      console.log('🔐 [useHealthKitSync] Requesting HealthKit permission...');
      const granted = await healthKitService.requestAuthorization();
      console.log('✅ HealthKit authorization result:', granted);
      
      if (granted) {
        // 🎯 Save authorization status persistently
        setHealthKitAuthorized(true);
        setHealthConnected(true);
        await syncSteps();
      }
      
      return granted;
    } finally {
      setIsLoading(false);
    }
  }, [setHealthConnected, setHealthKitAuthorized]);

  const syncSteps = useCallback(async (): Promise<number> => {
    if (!healthKitAuthorized && isAvailable) { // 🎯 Use global state
      const granted = await requestPermission();
      if (!granted) return 0;
    }

    setIsLoading(true);
    try {
      // 🎯 Get TODAY'S steps (from beginning of day) - for Daily Quests only
      const todayStepsCount = await healthKitService.getTodaySteps();
      setTodaySteps(todayStepsCount);
      
      // ✅ REMOVED: syncDailySteps() - no more Base XP for steps!
      // Users only get XP from: Solo Challenges, Team Challenges, and Badges
      
      try {
        console.log(`✅ Synced ${todayStepsCount} steps (no XP awarded)`);
        
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
        console.error('Failed to sync steps to backend:', error);
      }
      
      return todayStepsCount;
    } finally {
      setIsLoading(false);
    }
  }, [healthKitAuthorized, isAvailable, requestPermission, setTodaySteps, activeUserChallenge]);

  const getSteps = useCallback(
    async (startDate: Date, endDate: Date): Promise<number> => {
      if (!healthKitAuthorized && isAvailable) { // 🎯 Use global state
        const granted = await requestPermission();
        if (!granted) return 0;
      }

      return healthKitService.getSteps(startDate, endDate);
    },
    [healthKitAuthorized, isAvailable, requestPermission],
  );

  const getStepsHistory = useCallback(
    async (days: number): Promise<Array<{ date: string; steps: number }>> => {
      if (!healthKitAuthorized && isAvailable) { // 🎯 Use global state
        const granted = await requestPermission();
        if (!granted) return [];
      }

      try {
        // 🎯 WEB MOCK DATA: Generate random steps for testing on localhost
        if (!Capacitor.isNativePlatform()) {
          console.log(`📊 [Web Mock] Generating ${days} days of mock steps data`);
          const history = [];
          const today = new Date();
          
          for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            // Generate realistic random steps (2000-15000)
            const randomSteps = Math.floor(Math.random() * 13000) + 2000;
            
            history.push({
              date: date.toISOString().split('T')[0],
              steps: randomSteps
            });
          }
          
          console.log(`✅ [Web Mock] Generated ${history.length} days of mock data`);
          return history;
        }
        
        // 🎯 NATIVE: Real HealthKit data
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
    [healthKitAuthorized, isAvailable, requestPermission],
  );

  return {
    isAvailable,
    isAuthorized: healthKitAuthorized, // 🎯 Return global state
    todaySteps,
    isLoading,
    isNative: Capacitor.isNativePlatform(),
    requestPermission,
    syncSteps,
    getSteps,
    getStepsHistory,
    recheckAuthorization,
  };
}
