import { useEffect } from 'react';
import { useHealthKit } from '../../../hooks/useHealthKit';
import { updateChallengeProgress } from '../../../lib/api';
import type { UserChallenge } from '../../../types';
import { useChallengeStore } from '../../../stores/useChallengeStore';

/**
 * Hook for managing HealthKit sync logic
 * Handles: permissions, auto-sync, challenge progress updates
 */
export function useHealthKitSync(activeChallenge: UserChallenge | null) {
  const { 
    isAvailable: healthKitAvailable, 
    isAuthorized: healthKitAuthorized,
    requestPermission: requestHealthKitPermission,
    syncSteps,
    getSteps,
    isNative
  } = useHealthKit();

  const setActiveChallenge = useChallengeStore((s) => s.setActiveChallenge);

  // Request HealthKit permission when plugin is ready
  useEffect(() => {
    if (isNative && healthKitAvailable && !healthKitAuthorized) {
      console.log('🔐 [useHealthKitSync] Requesting HealthKit permission...');
      requestHealthKitPermission();
    }
  }, [isNative, healthKitAvailable, healthKitAuthorized, requestHealthKitPermission]);

  // Auto-sync steps every 5 minutes if authorized
  useEffect(() => {
    if (isNative && healthKitAuthorized) {
      console.log('🔄 [useHealthKitSync] Starting auto-sync for HealthKit steps...');
      
      // Initial sync
      syncSteps();
      
      // Sync every 5 minutes
      const interval = setInterval(() => {
        console.log('🔄 [useHealthKitSync] Auto-syncing steps...');
        syncSteps();
      }, 5 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [healthKitAuthorized, isNative]);

  // Sync active challenge progress with HealthKit
  useEffect(() => {
    if (isNative && healthKitAuthorized && activeChallenge) {
      const syncChallengeProgress = async () => {
        try {
          console.log('🔄 [useHealthKitSync] Syncing challenge progress with HealthKit...');
          const startDate = new Date(activeChallenge.started_at);
          const now = new Date();
          
          // Get total steps since challenge started
          const steps = await getSteps(startDate, now);
          console.log(`📊 [useHealthKitSync] Steps for challenge "${activeChallenge.admin_challenge?.title}": ${steps}`);
          
          // Only update if steps have increased
          if (steps > activeChallenge.current_steps) {
            console.log(`📈 [useHealthKitSync] Updating challenge progress: ${activeChallenge.current_steps} -> ${steps}`);
            
            // Update DB
            await updateChallengeProgress(activeChallenge.id, steps);
            
            // Update local store
            setActiveChallenge({
              ...activeChallenge,
              current_steps: steps
            });
            
            // Check for completion
            if (activeChallenge.admin_challenge?.goal_steps && steps >= activeChallenge.admin_challenge.goal_steps) {
               console.log('🎉 [useHealthKitSync] Challenge completed via HealthKit sync!');
               return true; // Signal completion
            }
          }
          return false;
        } catch (error) {
          console.error('❌ [useHealthKitSync] Failed to sync challenge progress:', error);
          return false;
        }
      };

      // Sync immediately
      syncChallengeProgress();

      // And sync periodically
      const interval = setInterval(syncChallengeProgress, 2 * 60 * 1000); // Every 2 mins
      return () => clearInterval(interval);
    }
  }, [isNative, healthKitAuthorized, activeChallenge?.id, getSteps]);

  return {
    healthKitAvailable,
    healthKitAuthorized,
    isNative
  };
}
