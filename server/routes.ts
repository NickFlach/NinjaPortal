import type { Express } from "express";
import { createServer } from "http";
import { WebSocketServer } from 'ws';
import { setupWebSocket } from './routes/websocket';
import musicRouter from './routes/music';
import playlistRouter from './routes/playlists';
import userRouter from './routes/users';
import adminRouter from './routes/admin';
import neoStorageRouter from './routes/neo-storage';
import translationRouter from './routes/translation';
import lumiraRouter from './routes/lumira';
import { establishSecureChannel } from './services/encryption';

export function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  // Add API routes
  app.use('/api/music', musicRouter);
  app.use('/api/playlists', playlistRouter);
  app.use('/api/users', userRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/translate', translationRouter);
  app.use('/api/lumira', lumiraRouter);
  app.use('/api/neo-storage', neoStorageRouter);

  // Initialize WebSocket server with enhanced security
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws',
    verifyClient: (info, cb) => {
      try {
        // Always reject Vite HMR connections first
        const protocol = info.req.headers['sec-websocket-protocol'];
        if (protocol === 'vite-hmr') {
          console.log('Rejecting Vite HMR connection');
          cb(false);
          return;
        }

        // Get client key with development fallback
        const clientKey = info.req.headers['x-quantum-key'] || 
          (process.env.NODE_ENV === 'development' ? 'dev-quantum-key' : null);

        if (!clientKey) {
          console.warn('Client attempted connection without quantum key');
          console.log('Connection headers:', info.req.headers);
          cb(false);
          return;
        }

        // Track upgraded sockets to prevent duplicates
        const socketId = info.req.headers['sec-websocket-key'];
        if (!socketId) {
          console.warn('Missing WebSocket key');
          cb(false);
          return;
        }

        console.log('Establishing secure channel for client');

        try {
          // Establish secure channel
          const channel = establishSecureChannel(clientKey as string);
          (info.req as any).secureChannel = channel;

          console.log('Secure channel established:', {
            channelId: channel.channelId,
            hasEncryptionKey: !!channel.encryptionKey,
            socketId
          });

          cb(true);
        } catch (secureError) {
          console.error('Failed to establish secure channel:', secureError);
          cb(false);
        }
      } catch (error) {
        console.error('Error in verifyClient:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          headers: info.req.headers
        });
        cb(false);
      }
    }
  });

  // Set up WebSocket handlers
  setupWebSocket(wss);

  return httpServer;
}