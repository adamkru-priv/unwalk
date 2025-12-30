import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.adamkruszewski.movee',
  appName: 'MOVEE',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
    // 🎯 ANDROID ONLY: Remove appStartPath, use index.html auto-redirect
    // 🎯 iOS needs this via platform override below
  },
  ios: {
    contentInset: 'never',
    // 🎯 iOS will use server.appStartPath from platform override
  },
  android: {
    allowMixedContent: false,
    // 🎯 Android: index.html detects Capacitor and auto-redirects to /app/app.html
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0B101B',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0B101B',
      overlaysWebView: true,
    },
  },
};

export default config;
