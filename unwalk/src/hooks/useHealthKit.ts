import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { healthKitService } from '../services/healthKit.native';
import { useChallengeStore } from '../stores/useChallengeStore';
import { syncDailySteps, getTodayQuest, updateQuestProgress } from '../lib/gamification';

export function useHealthKit() {
  const setHealthConnected = useChallengeStore((s) => s.setHealthConnected);
  const setTodaySteps = useChallengeStore((s) => s.setTodaySteps); // 🎯 NEW: Use global store
  const todaySteps = useChallengeStore((s) => s.todaySteps); // 🎯 NEW: Read from global store

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
      const steps = await healthKitService.getTodaySteps();
      setTodaySteps(steps); // 🎯 Update global store - this triggers re-render in ALL components!
      
      // Sync steps to backend and award Base XP
      try {
        await syncDailySteps(steps);
        console.log(`✅ Synced ${steps} steps → ${Math.floor(steps / 1000)} Base XP`);
        
        // Update Daily Quest progress if quest is steps-based
        try {
          const quest = await getTodayQuest();
          if (quest && quest.quest_type === 'steps' && !quest.claimed) {
            await updateQuestProgress(quest.id, steps);
            console.log(`✅ Updated Daily Quest progress: ${steps} / ${quest.target_value} steps`);
          }
        } catch (questError) {
          console.error('Failed to update quest progress:', questError);
        }
      } catch (error) {
        console.error('Failed to sync daily steps to backend:', error);
      }
      
      return steps;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthorized, isAvailable, requestPermission, setTodaySteps]);

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

  return {
    isAvailable,
    isAuthorized,
    todaySteps, // 🎯 Return from global store
    isLoading,
    isNative: Capacitor.isNativePlatform(),
    requestPermission,
    syncSteps,
    getSteps,
  };
}
