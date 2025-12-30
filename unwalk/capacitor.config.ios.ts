import type { CapacitorConfig } from '@capacitor/cli';
import config from './capacitor.config';

// iOS-specific config: add appStartPath
const iosConfig: CapacitorConfig = {
  ...config,
  server: {
    ...config.server,
    // iOS needs direct path to SPA
    appStartPath: 'app/app.html',
  },
};

export default iosConfig;
