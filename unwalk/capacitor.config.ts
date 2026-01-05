import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.adamkruszewski.movee',
  appName: 'MOVEE',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
    // 🎯 Android uses index.html auto-redirect, iOS uses appStartPath in JSON config
  },
  ios: {
    contentInset: 'never',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 300, // ✅ Reduced from 2000ms to 300ms (barely visible)
      backgroundColor: '#0B101B', // Match app background
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true,
      // ✅ Use custom splash screen image instead of default Capacitor icon
      launchAutoHide: true, // Auto-hide after duration
      androidSplashResourceName: 'splash', // Android uses res/drawable/splash.png
      iosSplashResourceName: 'Splash', // iOS uses Assets.xcassets/Splash.imageset
    },
    StatusBar: {
      style: 'DARK', // Light text (white) for dark background
      backgroundColor: '#0B101B', // Match app background
      overlaysWebView: true, // Let the app content flow under the status bar
    },
  },
};

export default config;
