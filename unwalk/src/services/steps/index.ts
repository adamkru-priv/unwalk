import type { StepsProvider, DailySteps } from './StepsProvider';
import { MockStepsProvider } from './MockStepsProvider';

/**
 * StepsService
 * 
 * Centralny serwis do zarządzania źródłem kroków.
 * Automatycznie wybiera odpowiedni provider (Mock, HealthKit, Google Fit, etc.)
 */
class StepsService {
  private provider: StepsProvider;
  private static instance: StepsService;

  private constructor() {
    // TODO: W przyszłości tutaj sprawdzimy platformę i wybierzemy właściwy provider
    // if (Capacitor.getPlatform() === 'ios') {
    //   this.provider = new HealthKitStepsProvider();
    // } else if (Capacitor.getPlatform() === 'android') {
    //   this.provider = new GoogleFitStepsProvider();
    // } else {
    //   this.provider = new MockStepsProvider();
    // }
    
    // Na razie zawsze używamy Mock
    this.provider = new MockStepsProvider();
    console.log('📱 [StepsService] Initialized with:', this.provider.getCapabilities().providerName);
  }

  /**
   * Singleton pattern - zawsze ta sama instancja
   */
  static getInstance(): StepsService {
    if (!StepsService.instance) {
      StepsService.instance = new StepsService();
    }
    return StepsService.instance;
  }

  /**
   * Inicjalizacja serwisu - wywołaj na starcie aplikacji
   */
  async initialize(): Promise<boolean> {
    console.log('🚀 [StepsService] Initializing...');
    
    const capabilities = this.provider.getCapabilities();
    console.log('📋 [StepsService] Capabilities:', capabilities);
    
    if (capabilities.requiresPermission) {
      const hasPermission = await this.provider.isConnected();
      
      if (!hasPermission) {
        console.log('⚠️ [StepsService] Permission required, requesting...');
        return await this.provider.requestPermissions();
      }
    }
    
    console.log('✅ [StepsService] Ready');
    return true;
  }

  /**
   * Pobierz kroki za dzisiaj
   */
  async getTodaySteps(): Promise<number> {
    try {
      const steps = await this.provider.getTodaySteps();
      console.log('👟 [StepsService] Today steps:', steps.toLocaleString());
      return steps;
    } catch (error) {
      console.error('❌ [StepsService] Error getting today steps:', error);
      return 0;
    }
  }

  /**
   * Pobierz kroki za konkretny dzień
   */
  async getStepsForDate(date: Date): Promise<number> {
    try {
      return await this.provider.getSteps(date);
    } catch (error) {
      console.error('❌ [StepsService] Error getting steps for date:', error);
      return 0;
    }
  }

  /**
   * Pobierz kroki za zakres dat (np. ostatnie 7 dni)
   */
  async getStepsRange(startDate: Date, endDate: Date): Promise<DailySteps[]> {
    try {
      return await this.provider.getStepsRange(startDate, endDate);
    } catch (error) {
      console.error('❌ [StepsService] Error getting steps range:', error);
      return [];
    }
  }

  /**
   * Pobierz kroki za ostatnie X dni
   */
  async getLastDaysSteps(days: number): Promise<DailySteps[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1); // +1 żeby włączyć dzisiejszy dzień
    
    return await this.getStepsRange(startDate, endDate);
  }

  /**
   * Sprawdź czy provider jest połączony
   */
  async isConnected(): Promise<boolean> {
    return await this.provider.isConnected();
  }

  /**
   * Poproś o uprawnienia
   */
  async requestPermissions(): Promise<boolean> {
    return await this.provider.requestPermissions();
  }

  /**
   * Pobierz informacje o możliwościach providera
   */
  getProviderInfo() {
    return this.provider.getCapabilities();
  }

  /**
   * Rozłącz providera
   */
  async disconnect(): Promise<void> {
    await this.provider.disconnect();
  }

  /**
   * Podmień providera (do testowania)
   */
  setProvider(provider: StepsProvider): void {
    this.provider = provider;
    console.log('🔄 [StepsService] Provider changed to:', provider.getCapabilities().providerName);
  }

  /**
   * Helper do testowania - ustaw bazowe kroki (tylko dla MockProvider)
   */
  setMockBaseSteps(steps: number): void {
    if (this.provider instanceof MockStepsProvider) {
      this.provider.setBaseSteps(steps);
    } else {
      console.warn('⚠️ [StepsService] setMockBaseSteps only works with MockStepsProvider');
    }
  }
}

// Export singletona
export const stepsService = StepsService.getInstance();
