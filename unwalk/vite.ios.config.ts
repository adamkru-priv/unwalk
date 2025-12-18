import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // For Capacitor builds, use relative asset paths.
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: 'index.html',
        app: 'app/index.html',
        spa: 'app/app.html',
      },
      external: ['capacitor-movee-healthkit'],
    },
  },
});
