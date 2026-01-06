import { registerPlugin } from '@capacitor/core';

export interface BackgroundStepCheckPlugin {
  // Sync Settings Management
  updateSyncSettings(options: { enabled: boolean; intervalMinutes: number }): Promise<{ 
    success: boolean; 
    enabled: boolean; 
    intervalMinutes: number 
  }>;
  getSyncSettings(): Promise<{ enabled: boolean; intervalMinutes: number }>;
  
  // Legacy methods (keep for backward compatibility)
  setCheckInterval(options: { minutes: number }): Promise<{ success: boolean; interval: number }>;
  getCheckInterval(): Promise<{ interval: number }>;
  setActiveChallengeData(options: { goalSteps: number; title: string }): Promise<{ success: boolean }>;
  clearActiveChallengeData(): Promise<{ success: boolean }>;
  getCachedSteps(): Promise<{ steps: number; timestamp: number; isCached: boolean }>;
  triggerManualCheck(): Promise<{ success: boolean; steps: number }>;
  getBackgroundCheckStatus(): Promise<{ 
    enabled: boolean; 
    interval: number; 
    lastCheckTimestamp: number;
    lastCheckDate?: string;
  }>;
}

const BackgroundStepCheck = registerPlugin<BackgroundStepCheckPlugin>('BackgroundStepCheck', {
  web: () => import('./web').then(m => new m.BackgroundStepCheckWeb()),
});

export default BackgroundStepCheck;
