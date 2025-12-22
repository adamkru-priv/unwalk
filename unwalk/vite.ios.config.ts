import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // For Capacitor iOS builds, use root-relative paths
  base: '/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        // Build all entry points - Capacitor needs index.html
        index: 'index.html',
        app: 'app/index.html',
        spa: 'app/app.html',
      },
      external: ['capacitor-movee-healthkit'],
    },
  },
});
