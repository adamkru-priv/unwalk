import { Capacitor, registerPlugin } from '@capacitor/core';

// Rejestrujemy nasz natywny plugin
export interface HealthKitPluginInterface {
  isAvailable(): Promise<{ available: boolean }>;
  requestAuthorization(): Promise<{ authorized: boolean }>;
  getSteps(options: { startDate: string; endDate: string }): Promise<{ steps: number }>;
}

const HealthKitNative = registerPlugin<HealthKitPluginInterface>('HealthKitPlugin');

// Types dla HealthKit
export interface HealthKitService {
  isAvailable: () => Promise<boolean>;
  requestAuthorization: () => Promise<boolean>;
  getStepCount: (startDate: Date, endDate: Date) => Promise<number>;
  getTodaySteps: () => Promise<number>;
}

// Native implementation używając naszego custom pluginu
class HealthKitNativeService implements HealthKitService {
  async isAvailable(): Promise<boolean> {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
      console.log('❌ HealthKit: Not iOS platform');
      return false;
    }

    try {
      const result = await HealthKitNative.isAvailable();
      console.log('✅ HealthKit available:', result.available);
      return result.available;
    } catch (error) {
      console.error('❌ HealthKit availability check failed:', error);
      return false;
    }
  }

  async requestAuthorization(): Promise<boolean> {
    try {
      console.log('🔐 Requesting HealthKit authorization...');
      const result = await HealthKitNative.requestAuthorization();
      console.log('✅ HealthKit authorization result:', result.authorized);
      return result.authorized;
    } catch (error) {
      console.error('❌ HealthKit authorization failed:', error);
      return false;
    }
  }

  async getStepCount(startDate: Date, endDate: Date): Promise<number> {
    try {
      console.log('📊 Fetching steps:', { 
        from: startDate.toISOString(), 
        to: endDate.toISOString() 
      });

      const result = await HealthKitNative.getSteps({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      console.log('✅ Total steps:', result.steps);
      return result.steps;
    } catch (error) {
      console.error('❌ Failed to fetch steps:', error);
      return 0;
    }
  }

  async getTodaySteps(): Promise<number> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    console.log('📅 Getting today\'s steps:', startOfDay.toISOString());
    return this.getStepCount(startOfDay, now);
  }
}

// Fallback dla web/development
class HealthKitMockService implements HealthKitService {
  async isAvailable(): Promise<boolean> {
    console.log('⚠️ HealthKit Mock: Running on web/simulator');
    return false;
  }

  async requestAuthorization(): Promise<boolean> {
    console.log('⚠️ HealthKit Mock: Authorization simulated');
    return true;
  }

  async getStepCount(_startDate: Date, _endDate: Date): Promise<number> {
    const mockSteps = Math.floor(Math.random() * 5000) + 2000;
    console.log('⚠️ HealthKit Mock: Returning mock steps:', mockSteps);
    return mockSteps;
  }

  async getTodaySteps(): Promise<number> {
    return this.getStepCount(new Date(), new Date());
  }
}

// Export odpowiedniej implementacji
export const healthKitService: HealthKitService = 
  Capacitor.isNativePlatform() 
    ? new HealthKitNativeService() 
    : new HealthKitMockService();
