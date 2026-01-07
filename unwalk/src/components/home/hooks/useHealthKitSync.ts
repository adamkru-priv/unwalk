import { useEffect, useRef } from 'react';
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

  // 🎯 FIX: Prevent multiple permission requests during initial load
  const hasRequestedPermission = useRef(false);

  // Request HealthKit permission when plugin is ready
  useEffect(() => {
    // Only request if:
    // 1. Native platform
    // 2. HealthKit available
    // 3. Not yet authorized
    // 4. Haven't requested in this session
    if (isNative && healthKitAvailable && !healthKitAuthorized && !hasRequestedPermission.current) {
      console.log('🔐 [useHealthKitSync] Requesting HealthKit permission...');
      hasRequestedPermission.current = true;
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
