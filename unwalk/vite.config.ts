import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    rollupOptions: {
      // This is a local/native-only Capacitor plugin. It won't exist in the web
      // bundle, so we externalize it to avoid Rollup resolution errors on Vercel.
      external: ['capacitor-movee-healthkit'],
    },
  },
})
