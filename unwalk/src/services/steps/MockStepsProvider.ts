import type { StepsProvider, DailySteps, StepsProviderCapabilities } from './StepsProvider';

/**
 * MockStepsProvider
 * 
 * Testowa implementacja StepsProvider która generuje realistyczne dane.
 * Użyj tego podczas developmentu zanim dodasz prawdziwą integrację z HealthKit.
 */
export class MockStepsProvider implements StepsProvider {
  private baseSteps = 8000; // Średnia dzienna ilość kroków
  private isPermissionGranted = false;

  async getSteps(date: Date): Promise<number> {
    // Generuj realistyczne dane na podstawie daty
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Weekendy = więcej kroków (spacery)
    const multiplier = isWeekend ? 1.3 : 1.0;
    
    // Dodaj trochę losowości (±2000 kroków)
    const randomVariation = Math.floor(Math.random() * 4000) - 2000;
    
    const steps = Math.max(0, Math.floor(this.baseSteps * multiplier + randomVariation));
    
    return steps;
  }

  async getTodaySteps(): Promise<number> {
    const now = new Date();
    const hour = now.getHours();
    
    // Symuluj wzrost kroków w ciągu dnia
    const progressFactor = Math.min(1, hour / 20); // Większość kroków do 20:00
    const targetSteps = await this.getSteps(now);
    
    return Math.floor(targetSteps * progressFactor);
  }

  async getStepsRange(startDate: Date, endDate: Date): Promise<DailySteps[]> {
    const result: DailySteps[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const steps = await this.getSteps(current);
      
      result.push({
        date: current.toISOString().split('T')[0],
        steps,
        distance: Math.floor(steps * 0.762), // ~0.762m per step average
        calories: Math.floor(steps * 0.04), // ~0.04 cal per step average
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return result;
  }

  async isConnected(): Promise<boolean> {
    return this.isPermissionGranted;
  }

  async requestPermissions(): Promise<boolean> {
    // Symuluj dialog z permissions
    console.log('🔐 [MockStepsProvider] Requesting permissions...');
    
    // W prawdziwej implementacji tutaj będzie dialog
    // Na razie zawsze zgadzamy się
    this.isPermissionGranted = true;
    
    console.log('✅ [MockStepsProvider] Permissions granted');
    return true;
  }

  getCapabilities(): StepsProviderCapabilities {
    return {
      canReadSteps: true,
      canReadHistory: true,
      canWriteSteps: false, // Mock nie zapisuje
      requiresPermission: true,
      providerName: 'Mock Provider (Development)',
    };
  }

  async disconnect(): Promise<void> {
    this.isPermissionGranted = false;
    console.log('👋 [MockStepsProvider] Disconnected');
  }

  /**
   * Helper: Ustaw bazową ilość kroków (do testowania)
   */
  setBaseSteps(steps: number): void {
    this.baseSteps = steps;
    console.log(`📊 [MockStepsProvider] Base steps set to ${steps}`);
  }
}
