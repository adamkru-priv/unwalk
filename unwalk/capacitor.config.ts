import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.movee.app',
  appName: 'MOVEE',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // iOS: start inside the SPA bundle
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
