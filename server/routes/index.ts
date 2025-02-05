import { Express } from "express";
import { createServer } from "http";
import feedRoutes from './feed';
import metadataRoutes from './metadata';
import userRoutes from './users';

// Middleware to check for internal token or user authentication
const authMiddleware = (req: any, res: any, next: any) => {
  const internalToken = req.headers['x-internal-token'];
  const walletAddress = req.headers['x-wallet-address'];

  console.log('Auth middleware check:', {
    path: req.path,
    hasInternalToken: !!internalToken,
    hasWalletAddress: !!walletAddress,
    method: req.method,
    headers: req.headers
  });

  // Allow internal access or wallet address
  if (internalToken === 'landing-page' || walletAddress) {
    return next();
  }

  // If neither is present, return error
  return res.status(401).json({ message: "Authentication required" });
};

let server: any = null;

export function registerRoutes(app: Express) {
  // Health check route (no auth required)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Register metadata routes first (before auth middleware)
  app.use(metadataRoutes);

  // Apply auth middleware to remaining API routes
  app.use('/api', authMiddleware);

  // Register other routes
  app.use(feedRoutes);
  app.use(userRoutes);

  // Handle 404 for non-existent API routes
  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Cleanup old server if it exists
  if (server) {
    server.close();
  }

  // Create new server
  server = createServer(app);

  // Error handling for server
  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      console.error('Port 5000 is in use, retrying...');
      setTimeout(() => {
        server.close();
        server.listen(5000, '0.0.0.0');
      }, 1000);
    }
  });

  return server;
}