import type { Express } from "express";
import { createServer } from "http";
import { setupWebSocket } from './routes/websocket';
import musicRouter from './routes/music';
import playlistRouter from './routes/playlists';
import userRouter from './routes/users';
import adminRouter from './routes/admin';
import neoStorageRouter from './routes/neo-storage';
import translationRouter from './routes/translation';
import lumiraRouter from './routes/lumira';

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

  // Initialize WebSocket server
  setupWebSocket(httpServer);

  return httpServer;
}