import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import BackgroundStepCheck from '../plugins/backgroundStepCheck';
import { useChallengeStore } from '../stores/useChallengeStore';

/**
 * Hook to automatically sync active challenge data with native iOS background tasks
 * Call this in HomeScreen or main app component
 */
export function useBackgroundChallengeSync() {
  const activeChallenge = useChallengeStore((s) => s.activeUserChallenge);
  const isIOS = Capacitor.getPlatform() === 'ios';

  useEffect(() => {
    if (!isIOS) return;

    const syncChallengeData = async () => {
      try {
        if (activeChallenge && activeChallenge.status === 'active') {
          // Sync active challenge to native
          const challenge = activeChallenge.admin_challenge;
          if (challenge) {
            await BackgroundStepCheck.setActiveChallengeData({
              goalSteps: challenge.goal_steps,
              title: challenge.title
            });
            console.log('[BackgroundSync] ✅ Challenge synced:', challenge.title);
          }
        } else {
          // Clear challenge data if no active challenge
          await BackgroundStepCheck.clearActiveChallengeData();
          console.log('[BackgroundSync] ✅ Challenge data cleared');
        }
      } catch (error) {
        console.error('[BackgroundSync] ❌ Failed to sync:', error);
      }
    };

    syncChallengeData();
  }, [activeChallenge, isIOS]);
}
