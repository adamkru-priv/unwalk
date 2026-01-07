import { registerPlugin } from '@capacitor/core';

export interface BackgroundStepCheckPlugin {
  // Cached steps access (for JS layer to read HealthKit cached data)
  getCachedSteps(): Promise<{ steps: number; timestamp: number; isCached: boolean }>;
}

const BackgroundStepCheck = registerPlugin<BackgroundStepCheckPlugin>('BackgroundStepCheck', {
  web: () => import('./web').then(m => new m.BackgroundStepCheckWeb()),
});

export default BackgroundStepCheck;
