declare global {
  interface Window {
    Capacitor?: {
      Plugins?: {
        ApnsToken?: {
          getToken?: () => Promise<{ token: string | null }>;
        };
      };
    };
  }
}

export {};