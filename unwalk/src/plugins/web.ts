import { WebPlugin } from '@capacitor/core';
import type { BackgroundStepCheckPlugin } from './backgroundStepCheck';

export class BackgroundStepCheckWeb extends WebPlugin implements BackgroundStepCheckPlugin {
  async setCheckInterval(options: { minutes: number }): Promise<{ success: boolean; interval: number }> {
    console.warn('[BackgroundStepCheck] Web platform does not support background tasks');
    localStorage.setItem('background_check_interval_minutes', options.minutes.toString());
    return { success: true, interval: options.minutes };
  }

  async getCheckInterval(): Promise<{ interval: number }> {
    const interval = parseInt(localStorage.getItem('background_check_interval_minutes') || '15');
    return { interval };
  }

  async setActiveChallengeData(options: { goalSteps: number; title: string }): Promise<{ success: boolean }> {
    localStorage.setItem('active_challenge_data', JSON.stringify(options));
    return { success: true };
  }

  async clearActiveChallengeData(): Promise<{ success: boolean }> {
    localStorage.removeItem('active_challenge_data');
    return { success: true };
  }

  async getCachedSteps(): Promise<{ steps: number; timestamp: number; isCached: boolean }> {
    return { steps: 0, timestamp: 0, isCached: false };
  }

  async triggerManualCheck(): Promise<{ success: boolean; steps: number }> {
    console.warn('[BackgroundStepCheck] Web platform does not support manual check');
    return { success: false, steps: 0 };
  }

  async getBackgroundCheckStatus(): Promise<{ enabled: boolean; interval: number; lastCheckTimestamp: number; lastCheckDate?: string }> {
    const interval = parseInt(localStorage.getItem('background_check_interval_minutes') || '15');
    return { 
      enabled: false, 
      interval, 
      lastCheckTimestamp: 0 
    };
  }
}
