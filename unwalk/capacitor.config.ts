import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.adamkruszewski.movee',
  appName: 'MOVEE',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
    // 🎯 FIX: iOS needs this to load SPA directly, Android auto-redirects from index.html
    appStartPath: 'app/app.html',
  },
  ios: {
    contentInset: 'never',
  },
  android: {
    allowMixedContent: false,
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
