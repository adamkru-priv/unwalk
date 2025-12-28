import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { healthKitService } from '../services/healthKit.native';
import { useChallengeStore } from '../stores/useChallengeStore';
import { syncDailySteps } from '../lib/gamification';

export function useHealthKit() {
  const setHealthConnected = useChallengeStore((s) => s.setHealthConnected);

  const [isAvailable, setIsAvailable] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [todaySteps, setTodaySteps] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const available = await healthKitService.isAvailable();
      setIsAvailable(available);

      // If available, attempt authorization once so we can persist a meaningful "connected" flag.
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios' && available) {
        const granted = await healthKitService.requestAuthorization();
        setIsAuthorized(granted);
        setHealthConnected(granted);
      } else {
        setHealthConnected(false);
      }
    })();
  }, [setHealthConnected]);

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
      setTodaySteps(steps);
      
      // 🎯 NEW: Sync steps to backend and award Base XP (1 XP per 1000 steps)
      try {
        await syncDailySteps(steps);
        console.log(`✅ Synced ${steps} steps → ${Math.floor(steps / 1000)} Base XP`);
      } catch (error) {
        console.error('Failed to sync daily steps to backend:', error);
      }
      
      return steps;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthorized, isAvailable, requestPermission]);

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
    todaySteps,
    isLoading,
    isNative: Capacitor.isNativePlatform(),
    requestPermission,
    syncSteps,
    getSteps,
  };
}
