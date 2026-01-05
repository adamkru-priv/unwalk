import { useEffect } from 'react';
import { analytics } from '../lib/analytics';

/**
 * Hook to track screen views automatically
 * Usage: useAnalytics(ScreenNames.HOME, { extra_prop: 'value' })
 */
export function useAnalytics(
  screenName: string,
  properties?: Record<string, any>
) {
  useEffect(() => {
    analytics.trackScreen(screenName, properties);
  }, [screenName, JSON.stringify(properties)]);
}

/**
 * Hook to identify user (call after login)
 */
export function useIdentifyUser(
  userId: string | null,
  userProperties?: Record<string, any>
) {
  useEffect(() => {
    if (userId) {
      analytics.identify(userId, userProperties);
    }
  }, [userId, JSON.stringify(userProperties)]);
}
