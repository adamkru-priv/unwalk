import { useEffect } from 'react';
import { useHealthKit } from '../../../hooks/useHealthKit';
import { updateChallengeProgress } from '../../../lib/api';
import type { UserChallenge } from '../../../types';
import { useChallengeStore } from '../../../stores/useChallengeStore';

/**
 * Hook for managing HealthKit sync logic
 * Handles: permissions, auto-sync, challenge progress updates for BOTH Solo and Team challenges
 */
export function useHealthKitSync(
  activeChallenge: UserChallenge | null,
  teamChallenge: UserChallenge | null = null // 🎯 NEW: Also sync Team challenge
) {
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

  // 🎯 NEW: Sync BOTH Solo and Team challenges with HealthKit
  useEffect(() => {
    if (!isNative || !healthKitAuthorized) {
      if (!isNative) {
        console.log('⏭️ [useHealthKitSync] Skipping auto-refresh - not iOS');
      } else if (!healthKitAuthorized) {
        console.log('⏭️ [useHealthKitSync] Skipping auto-refresh - HealthKit not authorized');
      }
      return;
    }

    // No active challenges to sync
    if (!activeChallenge && !teamChallenge) {
      console.log('⏭️ [useHealthKitSync] No active challenges to sync');
      return;
    }

    const syncChallengeProgress = async (challenge: UserChallenge, challengeType: 'Solo' | 'Team') => {
      try {
        const startDate = new Date(challenge.started_at);
        const now = new Date();
        
        // Get steps from challenge start date
        const steps = await getSteps(startDate, now);
        console.log(`📊 [useHealthKitSync] ${challengeType} challenge "${challenge.admin_challenge?.title}" steps: ${steps} (since ${startDate.toLocaleString()})`);
        
        // Only update if steps have increased
        if (steps > challenge.current_steps) {
          console.log(`📈 [useHealthKitSync] Updating ${challengeType} challenge progress: ${challenge.current_steps} -> ${steps}`);
          
          // Update DB
          await updateChallengeProgress(challenge.id, steps);
          
          // Update local store (only for Solo challenge)
          if (challengeType === 'Solo') {
            setActiveChallenge({
              ...challenge,
              current_steps: steps
            });
          }
          
          // Check for completion
          if (challenge.admin_challenge?.goal_steps && steps >= challenge.admin_challenge.goal_steps) {
            console.log(`🎉 [useHealthKitSync] ${challengeType} challenge completed via HealthKit sync!`);
            return true;
          }
        }
        return false;
      } catch (error) {
        console.error(`❌ [useHealthKitSync] Failed to sync ${challengeType} challenge progress:`, error);
        return false;
      }
    };

    const syncAllChallenges = async () => {
      const promises: Promise<boolean>[] = [];
      
      // Sync Solo challenge
      if (activeChallenge) {
        promises.push(syncChallengeProgress(activeChallenge, 'Solo'));
      }
      
      // Sync Team challenge
      if (teamChallenge) {
        promises.push(syncChallengeProgress(teamChallenge, 'Team'));
      }
      
      await Promise.all(promises);
    };

    console.log('🔄 [useHealthKitSync] Starting auto-refresh for challenges:', {
      solo: !!activeChallenge,
      team: !!teamChallenge
    });

    // Sync immediately
    syncAllChallenges();

    // And sync periodically (every 30 seconds for active challenges)
    const interval = setInterval(syncAllChallenges, 30 * 1000);
    return () => clearInterval(interval);
  }, [isNative, healthKitAuthorized, activeChallenge?.id, teamChallenge?.id, getSteps, setActiveChallenge]);

  return {
    healthKitAvailable,
    healthKitAuthorized,
    isNative
  };
}
