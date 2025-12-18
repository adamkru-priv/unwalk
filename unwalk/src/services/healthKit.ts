import { Capacitor } from '@capacitor/core';

// Native-only plugin loader (prevents Vercel/web builds from failing when the
// local Capacitor plugin isn't present in the build environment).
async function loadMoveeHealthKit() {
  return import('capacitor-movee-healthkit');
}

export const healthKitService = {
  async isAvailable(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.log('⚠️ Not native platform');
      return false;
    }
    try {
      const { MoveeHealthKit } = await loadMoveeHealthKit();
      const result = await MoveeHealthKit.isAvailable();
      console.log('✅ HealthKit available:', result.available);
      return result.available;
    } catch (error) {
      console.error('❌ HealthKit check failed:', error);
      return false;
    }
  },

  async requestAuthorization(): Promise<boolean> {
    try {
      const { MoveeHealthKit } = await loadMoveeHealthKit();
      console.log('🔐 Requesting HealthKit authorization...');
      const result = await MoveeHealthKit.requestAuthorization();
      console.log('✅ Authorization result:', result.authorized);
      return result.authorized;
    } catch (error) {
      console.error('❌ Authorization failed:', error);
      return false;
    }
  },

  async getSteps(startDate: Date, endDate: Date): Promise<number> {
    try {
      const { MoveeHealthKit } = await loadMoveeHealthKit();
      const result = await MoveeHealthKit.getSteps({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      console.log('✅ Steps:', result.steps);
      return result.steps;
    } catch (error) {
      console.error('❌ Failed to get steps:', error);
      return 0;
    }
  },

  async getTodaySteps(): Promise<number> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    return this.getSteps(startOfDay, now);
  },
};
