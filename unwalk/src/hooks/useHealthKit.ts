import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { healthKitService } from '../services/healthKit.native';
import { useChallengeStore } from '../stores/useChallengeStore';

export function useHealthKit() {
  const setHealthConnected = useChallengeStore((s) => s.setHealthConnected);

  const [isAvailable, setIsAvailable] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [todaySteps, setTodaySteps] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      const available = await healthKitService.isAvailable();
      if (!isMounted.current) return;
      setIsAvailable(available);

      // If available, attempt authorization once so we can persist a meaningful "connected" flag.
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios' && available) {
        const granted = await healthKitService.requestAuthorization();
        if (!isMounted.current) return;
        setIsAuthorized(granted);
        setHealthConnected(granted);
      } else {
        if (isMounted.current) setHealthConnected(false);
      }
    })();
  }, [setHealthConnected]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (isMounted.current) setIsLoading(true);
    try {
      const granted = await healthKitService.requestAuthorization();
      if (isMounted.current) {
        setIsAuthorized(granted);
        setHealthConnected(granted);
      }
      if (granted) {
        await syncSteps();
      }
      return granted;
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [setHealthConnected]);

  const syncSteps = useCallback(async (): Promise<number> => {
    if (!isAuthorized && isAvailable) {
      const granted = await requestPermission();
      if (!granted) return 0;
    }

    if (isMounted.current) setIsLoading(true);
    try {
      const steps = await healthKitService.getTodaySteps();
      if (isMounted.current) setTodaySteps(steps);
      return steps;
    } finally {
      if (isMounted.current) setIsLoading(false);
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
