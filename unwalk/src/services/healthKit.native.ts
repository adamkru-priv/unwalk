import { Capacitor } from '@capacitor/core';

// Native-only plugin loader.
// Prefer Capacitor.Plugins (native runtime) and fall back to dynamic import
// for environments where bundling provides the module.
function getMoveeHealthKitPlugin(): any {
  const plugins: any = (Capacitor as any).Plugins;
  return plugins?.MoveeHealthKit;
}

async function loadMoveeHealthKit() {
  const plugin = getMoveeHealthKitPlugin();
  if (plugin) return { MoveeHealthKit: plugin };
  return import('capacitor-movee-healthkit');
}

// Types dla HealthKit
export interface HealthKitService {
  echo: () => Promise<string>;
  isAvailable: () => Promise<boolean>;
  requestAuthorization: () => Promise<boolean>;
  // Keep legacy name used by some callers
  getStepCount: (startDate: Date, endDate: Date) => Promise<number>;
  // Alias used by hooks/web-style API
  getSteps: (startDate: Date, endDate: Date) => Promise<number>;
  getTodaySteps: () => Promise<number>;
}

// Native implementation używając naszego custom pluginu
class HealthKitNativeService implements HealthKitService {
  async echo(): Promise<string> {
    try {
      const { MoveeHealthKit } = await loadMoveeHealthKit();
      const result = await MoveeHealthKit.echo({ value: 'ping' });
      console.log('✅ HealthKit Native Echo:', result.value);
      return result.value;
    } catch (error) {
      console.error('❌ HealthKit Native Echo failed:', error);
      return '';
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
      console.log('❌ HealthKit: Not iOS platform');
      return false;
    }

    try {
      const { MoveeHealthKit } = await loadMoveeHealthKit();
      const result = await MoveeHealthKit.isAvailable();
      console.log('✅ HealthKit available:', result.available);
      return result.available;
    } catch (error) {
      console.error('❌ HealthKit availability check failed:', error);
      return false;
    }
  }

  async requestAuthorization(): Promise<boolean> {
    try {
      const { MoveeHealthKit } = await loadMoveeHealthKit();
      console.log('🔐 Requesting HealthKit authorization...');
      const result = await MoveeHealthKit.requestAuthorization();
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
        to: endDate.toISOString(),
      });

      const { MoveeHealthKit } = await loadMoveeHealthKit();
      const result = await MoveeHealthKit.getSteps({
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

  async getSteps(startDate: Date, endDate: Date): Promise<number> {
    return this.getStepCount(startDate, endDate);
  }

  async getTodaySteps(): Promise<number> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    console.log("📅 Getting today's steps:", startOfDay.toISOString());
    return this.getStepCount(startOfDay, now);
  }
}

// Fallback dla web/development
class HealthKitMockService implements HealthKitService {
  async echo(): Promise<string> {
    return 'pong';
  }

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

  async getSteps(startDate: Date, endDate: Date): Promise<number> {
    return this.getStepCount(startDate, endDate);
  }

  async getTodaySteps(): Promise<number> {
    return this.getStepCount(new Date(), new Date());
  }
}

// Export odpowiedniej implementacji
export const healthKitService: HealthKitService = Capacitor.isNativePlatform()
  ? new HealthKitNativeService()
  : new HealthKitMockService();
