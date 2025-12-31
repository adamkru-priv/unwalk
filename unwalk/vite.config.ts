import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: '/app/app.html', // Open React app directly in dev
  },
  // Use relative paths for Capacitor, absolute for web deployment
  base: './',
  build: {
    rollupOptions: {
      // Multi-page build: root LP + app SPA entry
      input: {
        // Root landing page
        index: 'index.html',
        // Landing Page in /app
        appLanding: 'app/index.html',
        // SPA entry (served at /app/app.html)
        spa: 'app/app.html',
      },
      // This is a local/native-only Capacitor plugin. It won't exist in the web
      // bundle, so we externalize it to avoid Rollup resolution errors on Vercel.
      external: ['capacitor-movee-healthkit'],
    },
  },
})
