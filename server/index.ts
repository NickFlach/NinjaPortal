import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Custom WebSocket type with isAlive property
interface CustomWebSocket extends WebSocket {
  isAlive: boolean;
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

const startServer = async (retryCount = 0) => {
  const maxRetries = 3;
  const basePort = 5000;
  const port = basePort + (retryCount * 100);

  try {
    const server = registerRoutes(app);

    // Initialize WebSocket server with a distinct path
    const wss = new WebSocketServer({ 
      server, 
      path: '/ws',
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024
        },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        concurrencyLimit: 10,
        threshold: 1024
      }
    });

    // WebSocket connection handling with proper error handling
    wss.on('connection', (ws: CustomWebSocket) => {
      ws.isAlive = true;
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      }, 30000);

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
        clearInterval(pingInterval);
      });

      ws.on('close', () => {
        clearInterval(pingInterval);
      });
    });

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error('Server error:', err);
      res.status(status).json({ message });
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      // Production mode - serve static files and handle client routing
      const distPath = path.resolve(__dirname, "..", "dist", "public");
      app.use(express.static(distPath));

      // Handle 404 for non-existent API routes
      app.use('/api/*', (_req, res) => {
        res.status(404).json({ error: 'API endpoint not found' });
      });

      // Serve index.html for all other routes to support client-side routing
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    // Ensure cleanup of existing connections before starting
    const cleanup = () => {
      wss.close(() => {
        server.close(() => {
          console.log('Server and WebSocket connections closed');
          process.exit(0);
        });
      });
    };

    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);

    await new Promise<void>((resolve, reject) => {
      server.listen(port, "0.0.0.0")
        .once('listening', () => {
          log(`Server running on port ${port}`);
          resolve();
        })
        .once('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE' && retryCount < maxRetries) {
            server.close();
            startServer(retryCount + 1);
          } else {
            reject(err);
          }
        });
    });

    // Health check interval
    const healthCheckInterval = setInterval(() => {
      wss.clients.forEach((ws: CustomWebSocket) => {
        if (!ws.isAlive) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    wss.on('close', () => {
      clearInterval(healthCheckInterval);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    if (retryCount < maxRetries) {
      console.log(`Retrying on port ${port + 100}...`);
      await startServer(retryCount + 1);
    } else {
      console.error('Max retries reached. Unable to start server.');
      process.exit(1);
    }
  }
};

startServer();