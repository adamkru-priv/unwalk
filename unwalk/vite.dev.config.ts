import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev-only config: serve the React SPA directly at /.
// Production remains multi-page (LP at /, web LP at /app, SPA entry at /app/app.html).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  // Assets should resolve from root in dev.
  base: '/',
  build: {
    rollupOptions: {
      // Serve SPA entry in dev; production uses vite.config.ts.
      input: {
        spa: 'app/app.html',
      },
      external: ['capacitor-movee-healthkit'],
    },
  },
});
