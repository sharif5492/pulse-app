import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { 
  handleAIChat, 
  handleAIVoiceSynthesis, 
  handleAIVideoGeneration 
} from './src/server/aiService.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));

  // API Route: Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // API Route: Gemini Chat
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const result = await handleAIChat(req.body);
      res.json(result);
    } catch (err: any) {
      console.error('API /api/ai/chat error:', err);
      res.status(500).json({ error: err?.message || 'Chat generation failed' });
    }
  });

  // API Route: Gemini Voice / TTS
  app.post('/api/ai/voice', async (req, res) => {
    try {
      const result = await handleAIVoiceSynthesis(req.body);
      res.json(result);
    } catch (err: any) {
      console.error('API /api/ai/voice error:', err);
      res.status(500).json({ error: err?.message || 'Voice synthesis failed' });
    }
  });

  // API Route: Veo 3 Video Generation
  app.post('/api/ai/generate-video', async (req, res) => {
    try {
      const result = await handleAIVideoGeneration(req.body);
      res.json(result);
    } catch (err: any) {
      console.error('API /api/ai/generate-video error:', err);
      res.status(500).json({ error: err?.message || 'Video generation failed' });
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pulse Social Server running on http://localhost:${PORT}`);
  });
}

startServer();
