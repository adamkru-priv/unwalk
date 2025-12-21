import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'

const redirectAppIndexPlugin = (): Plugin => ({
  name: 'redirect-app-index',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use(
      (
        req: IncomingMessage,
        res: ServerResponse,
        next: (err?: any) => void
      ) => {
        const url = req.url || '';
        if (url === '/app/' || url === '/app') {
          res.statusCode = 302;
          res.setHeader('Location', '/app/app.html');
          res.end();
          return;
        }
        next();
      }
    );
  },
});

export default defineConfig(({ command }) => ({
  plugins: [redirectAppIndexPlugin(), react()],
  server: {
    port: 3000,
    open: true,
  },
  // Dev: serve from / so Vite doesn't rewrite every HTML request to index.html.
  // Build: keep /app/ so production assets resolve under /app/.
  base: command === 'serve' ? '/' : '/app/',
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
}));
