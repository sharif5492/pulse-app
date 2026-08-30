import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { 
  handleAIChat, 
  handleAIVoiceSynthesis, 
  handleAIVideoGeneration 
} from './src/server/aiService';

function aiApiPlugin(): Plugin {
  return {
    name: 'ai-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/ai/')) {
          return next();
        }

        const chunks: any[] = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', async () => {
          let body: any = {};
          try {
            const raw = Buffer.concat(chunks).toString();
            if (raw) body = JSON.parse(raw);
          } catch {
            body = {};
          }

          res.setHeader('Content-Type', 'application/json');

          try {
            if (req.url === '/api/ai/chat') {
              const data = await handleAIChat(body);
              res.end(JSON.stringify(data));
            } else if (req.url === '/api/ai/voice') {
              const data = await handleAIVoiceSynthesis(body);
              res.end(JSON.stringify(data));
            } else if (req.url === '/api/ai/generate-video') {
              const data = await handleAIVideoGeneration(body);
              res.end(JSON.stringify(data));
            } else {
              next();
            }
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err?.message || 'Server error' }));
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), aiApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
