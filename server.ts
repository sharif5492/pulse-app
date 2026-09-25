import express from 'express';
import path from 'path';
import fs from 'fs';
import { 
  handleAIChat, 
  handleAIVoiceSynthesis, 
  handleAIVideoGeneration 
} from './src/server/aiService.ts';
import { socialRegistry } from './src/server/socialRegistry.ts';

// Active SSE client connections map: userId -> Set of Response objects
const sseClients: Map<string, Set<express.Response>> = new Map();

function broadcastToUser(userId: string, event: string, data: any) {
  if (!userId) return;
  const targets = new Set<string>();
  targets.add(userId);
  targets.add(userId.toLowerCase());
  const cleanWithout = userId.replace('usr_', '');
  targets.add(cleanWithout);
  targets.add(cleanWithout.toLowerCase());
  targets.add(`usr_${cleanWithout}`);
  targets.add(`usr_${cleanWithout}`.toLowerCase());

  const sentResponses = new Set<express.Response>();
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  for (const targetId of targets) {
    const clients = sseClients.get(targetId);
    if (clients && clients.size > 0) {
      for (const res of clients) {
        if (!sentResponses.has(res)) {
          sentResponses.add(res);
          try {
            res.write(payload);
          } catch (e) {
            clients.delete(res);
          }
        }
      }
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  const UPLOADS_DIR = path.join('/tmp', 'pulse_uploads');
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  // Serve persistent media files (real photos and real voice notes)
  app.use('/api/media', express.static(UPLOADS_DIR, {
    setHeaders: (res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Accept-Ranges', 'bytes');
    }
  }));

  // API Route: Upload Real Image or Real Voice Note
  app.post('/api/media/upload', (req, res) => {
    try {
      const { data, type, ext } = req.body;
      if (!data) {
        return res.status(400).json({ error: 'No media data provided' });
      }

      let buffer: Buffer;
      let extension = ext || (type === 'audio' ? 'webm' : 'jpg');

      if (typeof data === 'string' && data.startsWith('data:')) {
        const matches = data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mime = matches[1].toLowerCase();
          if (mime.includes('png')) extension = 'png';
          else if (mime.includes('gif')) extension = 'gif';
          else if (mime.includes('webp')) extension = 'webp';
          else if (mime.includes('jpeg') || mime.includes('jpg')) extension = 'jpg';
          else if (mime.includes('wav')) extension = 'wav';
          else if (mime.includes('mp4') || mime.includes('m4a')) extension = 'mp4';
          else if (mime.includes('webm')) extension = 'webm';
          else if (mime.includes('ogg')) extension = 'ogg';

          buffer = Buffer.from(matches[2], 'base64');
        } else {
          buffer = Buffer.from(data.split(',')[1] || data, 'base64');
        }
      } else if (typeof data === 'string') {
        buffer = Buffer.from(data, 'base64');
      } else {
        buffer = Buffer.from(data);
      }

      const fileId = `${type || 'file'}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${extension}`;
      const fullPath = path.join(UPLOADS_DIR, fileId);
      fs.writeFileSync(fullPath, buffer);

      const mediaUrl = `/api/media/${fileId}`;
      res.json({ success: true, url: mediaUrl, fileId });
    } catch (err: any) {
      console.error('Media upload error:', err);
      res.status(500).json({ error: err?.message || 'Media upload failed' });
    }
  });

  // API Route: Direct Raw Binary Upload (Preserves 100% audio fidelity without re-encoding or stripping)
  app.post('/api/media/upload-raw', express.raw({ type: '*/*', limit: '100mb' }), (req, res) => {
    try {
      if (!req.body || (Buffer.isBuffer(req.body) && req.body.length === 0)) {
        return res.status(400).json({ error: 'No media data received' });
      }

      const mime = (req.headers['content-type'] as string) || 'video/mp4';
      const originalName = (req.headers['x-filename'] as string) || 'video.mp4';
      const ext = originalName.split('.').pop() || (mime.includes('audio') ? 'mp3' : 'mp4');
      const fileId = `reel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const fullPath = path.join(UPLOADS_DIR, fileId);

      const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);
      fs.writeFileSync(fullPath, buffer);

      const mediaUrl = `/api/media/${fileId}`;
      res.json({ success: true, url: mediaUrl, fileId });
    } catch (err: any) {
      console.error('Raw media upload error:', err);
      res.status(500).json({ error: err?.message || 'Raw upload failed' });
    }
  });

  // API Route: Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // ==========================================
  // MULTI-USER DISCOVERY & REGISTRY ENDPOINTS
  // ==========================================

  // Register / Synchronize current user profile from client device
  app.post('/api/users/sync', (req, res) => {
    try {
      const user = req.body?.user || req.body;
      if (!user || !user.id) {
        return res.status(400).json({ error: 'User id is required' });
      }
      const updated = socialRegistry.registerOrUpdateUser(user);
      res.json({ success: true, user: updated });
    } catch (err: any) {
      console.error('API /api/users/sync error:', err);
      res.status(500).json({ error: err?.message || 'Sync failed' });
    }
  });

  // Get all registered users across all devices
  app.get('/api/users', (req, res) => {
    try {
      const exclude = (req.query.exclude as string) || undefined;
      const users = socialRegistry.getAllUsers(exclude);
      res.json({ success: true, users });
    } catch (err: any) {
      console.error('API /api/users error:', err);
      res.status(500).json({ error: err?.message || 'Failed to fetch users' });
    }
  });

  // Search users across all connected devices
  app.get('/api/users/search', (req, res) => {
    try {
      const query = (req.query.q as string) || '';
      const currentUserId = (req.query.currentUserId as string) || undefined;
      const result = socialRegistry.searchUsers(query, currentUserId);
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('API /api/users/search error:', err);
      res.status(500).json({ error: err?.message || 'Search failed' });
    }
  });

  // Lookup single user by exact ID or username
  app.get('/api/users/lookup/:idOrUsername', (req, res) => {
    try {
      const user = socialRegistry.getUserByIdOrUsername(req.params.idOrUsername);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      res.json({ success: true, user });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Lookup failed' });
    }
  });

  // ==========================================
  // CROSS-DEVICE CONNECTIONS / FRIEND REQUESTS
  // ==========================================

  // Send friend connection request
  app.post('/api/connections/request', (req, res) => {
    try {
      const { requesterId, receiverId, requester, receiver } = req.body;
      if (!requesterId || !receiverId) {
        return res.status(400).json({ error: 'requesterId and receiverId are required' });
      }
      const conn = socialRegistry.createConnection(requesterId, receiverId, requester, receiver);
      
      // Notify receiver and requester immediately via SSE across both original and resolved IDs
      broadcastToUser(receiverId, 'connection_request', conn);
      broadcastToUser(conn.receiverId, 'connection_request', conn);
      broadcastToUser(conn.requesterId, 'connection_request', conn);

      res.json({ success: true, connection: conn });
    } catch (err: any) {
      console.error('API /api/connections/request error:', err);
      res.status(500).json({ error: err?.message || 'Connection request failed' });
    }
  });

  // Cancel or unfriend connection
  app.post('/api/connections/cancel', (req, res) => {
    try {
      const { requesterId, receiverId, connectionId } = req.body;
      const updated = socialRegistry.respondConnection({ connectionId, requesterId, receiverId }, 'cancelled');
      if (requesterId && receiverId) {
        socialRegistry.removeConnection(requesterId, receiverId);
      }
      const payload = updated || { requesterId, receiverId, status: 'cancelled' };
      if (requesterId) broadcastToUser(requesterId, 'connection_updated', payload);
      if (receiverId) broadcastToUser(receiverId, 'connection_updated', payload);

      res.json({ success: true, status: 'cancelled' });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Cancel failed' });
    }
  });

  // Respond to friend request (accept / decline / cancel)
  app.post('/api/connections/respond', (req, res) => {
    try {
      const { connectionId, requesterId, receiverId, status } = req.body;
      const updated = socialRegistry.respondConnection({ connectionId, requesterId, receiverId }, status);
      if (!updated) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      // Notify both parties
      broadcastToUser(updated.requesterId, 'connection_updated', updated);
      broadcastToUser(updated.receiverId, 'connection_updated', updated);

      res.json({ success: true, connection: updated });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Connection response failed' });
    }
  });

  // Get user connections
  app.get('/api/connections', (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: 'userId parameter required' });
      }
      const list = socialRegistry.getUserConnections(userId);
      res.json({ success: true, connections: list });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to fetch connections' });
    }
  });

  // ==========================================
  // CROSS-DEVICE DIRECT MESSAGING
  // ==========================================

  // Send chat message
  app.post('/api/messages/send', (req, res) => {
    try {
      const { conversationId, senderId, senderName, senderAvatar, receiverId, text, mediaType, mediaUrl, audioDuration } = req.body;
      if (!senderId || (!text && !mediaType && !mediaUrl)) {
        return res.status(400).json({ error: 'Invalid message payload' });
      }
      const saved = socialRegistry.saveMessage({
        conversationId,
        senderId,
        senderName,
        senderAvatar,
        receiverId,
        text,
        mediaType,
        mediaUrl,
        audioDuration,
      });

      if (receiverId) {
        broadcastToUser(receiverId, 'chat_message', saved);
      }

      res.json({ success: true, message: saved });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to send message' });
    }
  });

  // Delete chat message
  app.post('/api/messages/delete', (req, res) => {
    try {
      const { messageId, conversationId, receiverId } = req.body;
      if (!messageId) {
        return res.status(400).json({ error: 'messageId is required' });
      }
      const deleted = socialRegistry.deleteMessage(messageId);
      if (receiverId) {
        broadcastToUser(receiverId, 'chat_message_deleted', { messageId, conversationId });
      }
      res.json({ success: true, deleted });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to delete message' });
    }
  });

  // Get chat messages
  app.get('/api/messages', (req, res) => {
    try {
      const userId = req.query.userId as string;
      const conversationId = req.query.conversationId as string | undefined;
      const since = req.query.since ? parseInt(req.query.since as string, 10) : undefined;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }
      const list = socialRegistry.getMessagesForUser(userId, conversationId, since);
      res.json({ success: true, messages: list });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to get messages' });
    }
  });

  // ==========================================
  // CROSS-DEVICE WEBRTC SIGNALING (AUDIO/VIDEO)
  // ==========================================

  // Post WebRTC signal
  app.post('/api/signals/send', (req, res) => {
    try {
      const { from, to, signal } = req.body;
      if (!from || !to || !signal) {
        return res.status(400).json({ error: 'from, to, and signal are required' });
      }
      const record = socialRegistry.sendSignal(from, to, signal);
      
      // Dispatch immediately over SSE if receiver connected
      broadcastToUser(to, 'call_signal', record);

      res.json({ success: true, signal: record });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Signaling failed' });
    }
  });

  // Poll WebRTC signals for a user
  app.get('/api/signals', (req, res) => {
    try {
      const userId = req.query.userId as string;
      const since = req.query.since ? parseInt(req.query.since as string, 10) : undefined;
      if (!userId) {
        return res.status(400).json({ error: 'userId required' });
      }
      const signals = socialRegistry.getSignalsForUser(userId, since);
      res.json({ success: true, signals });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Signal retrieval failed' });
    }
  });

  // ==========================================
  // SERVER-SENT EVENTS (SSE) REALTIME STREAM
  // ==========================================
  app.get('/api/realtime/stream', (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).send('userId is required for realtime stream');
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    res.write(`event: connected\ndata: ${JSON.stringify({ userId, connectedAt: Date.now() })}\n\n`);

    if (!sseClients.has(userId)) {
      sseClients.set(userId, new Set());
    }
    sseClients.get(userId)!.add(res);

    // Keepalive ping every 25s
    const pingTimer = setInterval(() => {
      try {
        res.write(`event: ping\ndata: ${Date.now()}\n\n`);
      } catch {
        clearInterval(pingTimer);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(pingTimer);
      const set = sseClients.get(userId);
      if (set) {
        set.delete(res);
        if (set.size === 0) {
          sseClients.delete(userId);
        }
      }
    });
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
  const distPath = path.join(process.cwd(), 'dist');
  const hasBuiltDist = fs.existsSync(path.join(distPath, 'index.html'));
  const isDev = process.env.NODE_ENV === 'development' || (!hasBuiltDist && process.env.NODE_ENV !== 'production');

  if (isDev) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.warn('[Server] Could not initialize Vite middleware mode:', viteErr);
      if (hasBuiltDist) {
        app.use(express.static(distPath));
        app.get('*', (_req, res) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }
    }
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pulse Social Server running on http://localhost:${PORT}`);
  });
}

startServer();
