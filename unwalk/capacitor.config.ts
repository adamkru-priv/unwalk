import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.movee.app',
  appName: 'MOVEE',
  webDir: 'dist',
  // Use a custom scheme so OAuth providers (Apple) can redirect back into the app.
  // You'll also need to add the same scheme under iOS Target -> Info -> URL Types.
  // Example redirect URL: movee://auth/callback
  appScheme: 'movee',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0B101B', // Match app background
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK', // Light text (white) for dark background
      backgroundColor: '#0B101B', // Match app background
      overlaysWebView: true, // Let the app content flow under the status bar
    },
  },
};

export default config;
