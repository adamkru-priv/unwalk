/**
 * StepsProvider Interface
 * 
 * Abstrakcja dla różnych źródeł danych o krokach.
 * Obecnie: Mock (testowe dane)
 * Przyszłość: HealthKit (iOS), Google Fit (Android), Fitbit, Strava, etc.
 */

export interface DailySteps {
  date: string; // YYYY-MM-DD format
  steps: number;
  distance?: number; // meters
  calories?: number;
}

export interface StepsProviderCapabilities {
  canReadSteps: boolean;
  canReadHistory: boolean;
  canWriteSteps: boolean;
  requiresPermission: boolean;
  providerName: string;
}

export interface StepsProvider {
  /**
   * Get steps for a specific date
   */
  getSteps(date: Date): Promise<number>;
  
  /**
   * Get steps for today
   */
  getTodaySteps(): Promise<number>;
  
  /**
   * Get steps for a date range
   */
  getStepsRange(startDate: Date, endDate: Date): Promise<DailySteps[]>;
  
  /**
   * Check if provider is connected and has permissions
   */
  isConnected(): Promise<boolean>;
  
  /**
   * Request permissions (for HealthKit, Google Fit, etc.)
   */
  requestPermissions(): Promise<boolean>;
  
  /**
   * Get provider capabilities
   */
  getCapabilities(): StepsProviderCapabilities;
  
  /**
   * Disconnect/logout from provider
   */
  disconnect(): Promise<void>;
}
