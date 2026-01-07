import { WebPlugin } from '@capacitor/core';
import type { BackgroundStepCheckPlugin } from './backgroundStepCheck';

export class BackgroundStepCheckWeb extends WebPlugin implements BackgroundStepCheckPlugin {
  async getCachedSteps(): Promise<{ steps: number; timestamp: number; isCached: boolean }> {
    return { steps: 0, timestamp: 0, isCached: false };
  }
}
