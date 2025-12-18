import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.movee.app',
  appName: 'MOVEE',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    // Ensure native app starts in the SPA (LP lives at /)
    appStartPath: 'app/app.html',
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
