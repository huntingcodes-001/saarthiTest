import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as fs from 'fs/promises'; // ADDED: Node.js File System
import * as path from 'path';      // ADDED: Node.js Path utility

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
        // Define the path to the log file (in the project root)
        const logFilePath = path.join(process.cwd(), 'visitor_log.txt');
        
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

          // ADDED: Log endpoint now writes to a file
          if (req.method === 'POST' && req.url.startsWith('/api/log')) {
            try {
              let logData = '';
              // Consume the stream to read the body
              await new Promise<void>((resolve) => {
                req.on('data', (chunk) => {
                  logData += chunk.toString();
                });
                req.on('end', () => resolve());
              });
              
              // LOGIC: Append data to the log file, adding a newline for separation
              await fs.appendFile(logFilePath, logData + '\n', 'utf8');

              // Log to console for real-time visibility during development
              console.log(`[Visitor Logger] Data successfully written to ${logFilePath}`);
              
              res.statusCode = 200;
              res.setHeader('Content-Type', 'text/plain');
              return res.end('Log received and written to file successfully');
            } catch (e) {
              console.error(`[Visitor Logger] Failed to write to file ${logFilePath}:`, e);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: 'Server logging failed. Check permissions.' }));
            }
          } // END LOG ENDPOINT


          return next();
        });
      },
    },
  ],
});