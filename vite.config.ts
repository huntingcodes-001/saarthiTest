import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 5174,
  },
  plugins: [
    react(),
    {
      name: 'mock-api',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url) return next();

          // Health check: respond to HEAD /api/health with 200
          if (req.method === 'HEAD' && req.url.startsWith('/api/health')) {
            res.statusCode = 200;
            return res.end();
          }

          // Optional: also support GET for manual checks
          if (req.method === 'GET' && req.url.startsWith('/api/health')) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ status: 'ok' }));
          }

          // Mock upload endpoint: accept POST /api/upload and return a fake transcript
          if (req.method === 'POST' && req.url.startsWith('/api/upload')) {
            try {
              // We do not parse the multipart body here; just consume the stream
              await new Promise<void>((resolve) => {
                req.on('data', () => {});
                req.on('end', () => resolve());
              });
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              const transcript = '[Mock transcript] Your audio was received successfully.';
              return res.end(JSON.stringify({ transcript }));
            } catch {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: 'Mock upload failed' }));
            }
          }

          return next();
        });
      },
    },
  ],
});
