declare module 'capacitor-movee-healthkit' {
  export const MoveeHealthKit: {
    echo: (options: { value: string }) => Promise<{ value: string }>;
    isAvailable: () => Promise<{ available: boolean }>;
    requestAuthorization: () => Promise<{ authorized: boolean }>;
    getSteps: (options: { startDate: string; endDate: string }) => Promise<{ steps: number }>;
  };
}
