import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  // The marketing/landing page will be served from / (root).
  // The SPA will be built and served from /app.
  base: '/app/',
  build: {
    rollupOptions: {
      // Multi-page build: root LP + app SPA entry
      input: {
        // Root landing page
        index: 'index.html',
        // SPA entry (served at /app)
        app: 'app/index.html',
        // SPA entry for web (served at /app/app.html)
        spa: 'app/app.html',
      },
      // This is a local/native-only Capacitor plugin. It won't exist in the web
      // bundle, so we externalize it to avoid Rollup resolution errors on Vercel.
      external: ['capacitor-movee-healthkit'],
    },
  },
})
