/**
 * Control Plane HTTP Server - HARDENED VERSION
 *
 * Production-grade HTTP server with secure defaults.
 * - Default bind to localhost (not 0.0.0.0)
 * - CORS by allowlist only (no wildcard)
 * - Explicit env configuration
 */

import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import http from 'http';
import { createLogger } from '../../observability/logger/structuredLogger.js';
import { initializeAuditLogger, stopAuditLogger } from '../audit/adminAuditLogger.js';
import router from './router.js';
import { dashboardRouter } from '../../dashboard/http/router.js';

const logger = createLogger({ subsystem: 'control_plane_server' });

/** Server configuration */
interface ServerConfig {
  port: number;
  host: string;
  requestTimeout: number;
  bodyLimit: string;
  corsOrigins: string[];
  enableCors: boolean;
}

/** Default server configuration - SECURE DEFAULTS */
const DEFAULT_CONFIG: ServerConfig = {
  port: parseInt(process.env.CONTROL_PLANE_PORT || '3001', 10),
  // SECURE DEFAULT: Bind to localhost by default
  // Only change to 0.0.0.0 if explicitly needed for container networking
  host: process.env.CONTROL_PLANE_HOST || '127.0.0.1',
  requestTimeout: 30000,
  bodyLimit: '10mb',
  // SECURE: Empty array = no CORS unless explicitly configured
  corsOrigins: process.env.CONTROL_PLANE_CORS_ORIGINS
    ? process.env.CONTROL_PLANE_CORS_ORIGINS.split(',').map(o => o.trim())
    : [],
  // SECURE: CORS disabled by default
  enableCors: process.env.CONTROL_PLANE_ENABLE_CORS === 'true',
};

/** Create Express application */
export function createApp(config: Partial<ServerConfig> = {}): Express {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  // CORS - SECURE: Only enable if explicitly configured
  if (cfg.enableCors) {
    if (cfg.corsOrigins.length === 0) {
      logger.warn('CORS enabled but no origins configured - rejecting all requests');
    }

    const corsOptions: cors.CorsOptions = {
      origin: (origin, callback) => {
        // If no origin header (same-origin request), allow it
        if (!origin) {
          return callback(null, true);
        }

        // Check against allowlist
        if (cfg.corsOrigins.includes(origin) || cfg.corsOrigins.includes('*')) {
          return callback(null, true);
        }

        logger.warn('CORS rejected origin', { origin, allowedOrigins: cfg.corsOrigins });
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id', 'x-request-id', 'x-internal-secret', 'x-actor-id', 'x-actor-role'],
      exposedHeaders: ['x-correlation-id', 'x-request-id'],
      maxAge: 86400, // 24 hours
    };

    app.use(cors(corsOptions));
    logger.info('CORS enabled with origins', { origins: cfg.corsOrigins });
  } else {
    // No CORS - more secure for internal services
    app.use((req, res, next) => {
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      next();
    });
    logger.info('CORS disabled - internal service mode');
  }

  // Body parsing
  app.use(express.json({ limit: cfg.bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: cfg.bodyLimit }));

  // Request timeout
  app.use((req, res, next) => {
    const timeout = setTimeout(() => {
      logger.warn('Request timeout', {
        path: req.path,
        method: req.method,
        correlationId: req.headers['x-correlation-id'],
      });
      res.status(504).json({
        ok: false,
        status: 'error',
        error: { code: 'TIMEOUT', message: 'Request timed out' },
        timestamp: new Date().toISOString(),
      });
    }, cfg.requestTimeout);

    res.on('finish', () => clearTimeout(timeout));
    next();
  });

  // Mount router
  app.use('/internal', router);
  app.use('/internal', dashboardRouter);

  // Root health check (minimal, no internal details)
  app.get('/', (req, res) => {
    res.json({
      ok: true,
      status: 'success',
      data: {
        service: 'control-plane',
        version: process.env.SERVICE_VERSION || '1.0.0',
        status: 'running',
      },
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}

/** Create and start server */
export async function startServer(config: Partial<ServerConfig> = {}): Promise<{ app: Express; server: http.Server }> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Validate config
  if (!cfg.host) {
    throw new Error('CONTROL_PLANE_HOST is required');
  }

  // Initialize audit logger
  initializeAuditLogger();

  // Create app
  const app = createApp(cfg);

  // Create HTTP server
  const server = http.createServer(app);

  // Start listening
  return new Promise((resolve, reject) => {
    server.listen(cfg.port, cfg.host, () => {
      logger.info(`Control plane server started`, {
        host: cfg.host,
        port: cfg.port,
        pid: process.pid,
        corsEnabled: cfg.enableCors,
        corsOrigins: cfg.corsOrigins,
      });

      resolve({ app, server });
    });

    server.on('error', (err: Error) => {
      logger.error('Server error', err);
      reject(err);
    });
  });
}

/** Graceful shutdown */
export function setupGracefulShutdown(server: http.Server): void {
  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    server.close(async () => {
      logger.info('HTTP server closed');

      // Stop audit logger
      stopAuditLogger();

      logger.info('Shutdown complete');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

export default { createApp, startServer, setupGracefulShutdown };
