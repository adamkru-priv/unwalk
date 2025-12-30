import { useEffect } from 'react';
import { useHealthKit } from '../../../hooks/useHealthKit';

/**
 * Hook for managing HealthKit permissions only
 * Manual sync is triggered by refresh button click on slides
 */
export function useHealthKitSync() {
  const { 
    isAvailable: healthKitAvailable, 
    isAuthorized: healthKitAuthorized,
    requestPermission: requestHealthKitPermission,
    isNative
  } = useHealthKit();

  // Request HealthKit permission when plugin is ready
  useEffect(() => {
    if (isNative && healthKitAvailable && !healthKitAuthorized) {
      console.log('🔐 [useHealthKitSync] Requesting HealthKit permission...');
      requestHealthKitPermission();
    }
  }, [isNative, healthKitAvailable, healthKitAuthorized, requestHealthKitPermission]);

  // 🎯 REMOVED: All automatic sync intervals
  // Manual sync is now triggered only by refresh button click

  return {
    healthKitAvailable,
    healthKitAuthorized,
    isNative
  };
}
