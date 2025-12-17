import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { healthKitService } from '../services/healthKit';

export function useHealthKit() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [todaySteps, setTodaySteps] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkAvailability();
  }, []);

  async function checkAvailability() {
    const available = await healthKitService.isAvailable();
    setIsAvailable(available);
  }

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const granted = await healthKitService.requestAuthorization();
      setIsAuthorized(granted);
      if (granted) {
        await syncSteps();
      }
      return granted;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const syncSteps = useCallback(async (): Promise<number> => {
    if (!isAuthorized && isAvailable) {
      const granted = await requestPermission();
      if (!granted) return 0;
    }

    setIsLoading(true);
    try {
      const steps = await healthKitService.getTodaySteps();
      setTodaySteps(steps);
      return steps;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthorized, isAvailable]);

  return {
    isAvailable,
    isAuthorized,
    todaySteps,
    isLoading,
    isNative: Capacitor.isNativePlatform(),
    requestPermission,
    syncSteps,
  };
}
