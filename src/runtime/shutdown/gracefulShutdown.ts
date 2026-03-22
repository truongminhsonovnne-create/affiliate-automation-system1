/**
 * Runtime Layer - Graceful Shutdown
 * Handles graceful shutdown of runtime components
 */

import type { RuntimeShutdownReason } from '../types';
import { GRACEFUL_SHUTDOWN_TIMEOUT_MS, FORCE_KILL_TIMEOUT_MS } from '../constants';
import { getProcessIdentity } from '../bootstrap/bootstrapRuntime';

// =============================================================================
// SHUTDOWN HANDLERS
// =============================================================================

/** Shutdown callback type */
type ShutdownCallback = (reason: RuntimeShutdownReason) => Promise<void> | void;

/** Registered shutdown callbacks */
const shutdownCallbacks: ShutdownCallback[] = [];

/** Shutdown state */
let isShuttingDown = false;

/**
 * Register graceful shutdown handlers
 */
export function registerGracefulShutdownHandlers(options?: {
  logger?: {
    info: (msg: string, meta?: Record<string, unknown>) => void;
    error: (msg: string, meta?: Record<string, unknown>) => void;
  };
  onShutdown?: (reason: RuntimeShutdownReason) => Promise<void> | void;
}): void {
  const logger = options?.logger ?? console;

  // Handle SIGTERM (Kubernetes, Docker)
  process.on('SIGTERM', async () => {
    logger.info('[Shutdown] Received SIGTERM');
    await gracefullyShutdownRuntime('signal', { logger });
  });

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    logger.info('[Shutdown] Received SIGINT');
    await gracefullyShutdownRuntime('signal', { logger });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    logger.error('[Shutdown] Uncaught exception', { error: error.message, stack: error.stack });
    await gracefullyShutdownRuntime('error', { logger });
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason) => {
    logger.error('[Shutdown] Unhandled rejection', { reason });
    await gracefullyShutdownRuntime('error', { logger });
  });

  // Register custom shutdown callback
  if (options?.onShutdown) {
    registerShutdownCallback(options.onShutdown);
  }
}

/**
 * Register a shutdown callback
 */
export function registerShutdownCallback(callback: ShutdownCallback): void {
  shutdownCallbacks.push(callback);
}

/**
 * Gracefully shutdown runtime
 */
export async function gracefullyShutdownRuntime(
  reason: RuntimeShutdownReason,
  options?: {
    timeout?: number;
    logger?: {
      info: (msg: string, meta?: Record<string, unknown>) => void;
      error: (msg: string, meta?: Record<string, unknown>) => void;
    };
  }
): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  const logger = options?.logger ?? console;
  const identity = getProcessIdentity();

  logger.info('[Shutdown] Starting graceful shutdown', {
    reason,
    role: identity?.role,
    instanceId: identity?.instanceId,
  });

  const timeout = options?.timeout ?? GRACEFUL_SHUTDOWN_TIMEOUT_MS;

  try {
    // Run shutdown callbacks with timeout
    await Promise.race([
      runShutdownCallbacks(reason),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Shutdown timeout')), timeout)
      ),
    ]);

    logger.info('[Shutdown] Callbacks completed');
  } catch (error) {
    logger.error('[Shutdown] Error during shutdown', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
  }

  // Force exit if needed
  const forceKillTimeout = FORCE_KILL_TIMEOUT_MS;
  setTimeout(() => {
    logger.error('[Shutdown] Force killing process');
    process.exit(1);
  }, forceKillTimeout);

  logger.info('[Shutdown] Graceful shutdown complete');
  process.exit(0);
}

// =============================================================================
// SHUTDOWN HELPERS
// =============================================================================

/**
 * Run all shutdown callbacks
 */
async function runShutdownCallbacks(reason: RuntimeShutdownReason): Promise<void> {
  for (const callback of shutdownCallbacks) {
    try {
      await callback(reason);
    } catch (error) {
      console.error('[Shutdown] Callback error', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
  }
}

/**
 * Shutdown HTTP servers
 */
export async function shutdownHttpServers(
  servers: Array<{ close: (cb?: (err?: Error) => void) => void }>,
  options?: {
    timeout?: number;
    logger?: {
      info: (msg: string, meta?: Record<string, unknown>) => void;
      error: (msg: string, meta?: Record<string, unknown>) => void;
    };
  }
): Promise<void> {
  const logger = options?.logger ?? console;
  const timeout = options?.timeout ?? 10000;

  logger.info('[Shutdown] Closing HTTP servers', { count: servers.length });

  const closePromises = servers.map(
    (server) =>
      new Promise<void>((resolve) => {
        server.close(() => {
          logger.info('[Shutdown] Server closed');
          resolve();
        });
      })
  );

  await Promise.race([
    Promise.all(closePromises),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Server close timeout')), timeout)
    ),
  ]);
}

/**
 * Shutdown workers
 */
export async function shutdownWorkers(
  workers: Array<{ stop: () => Promise<void> }>,
  options?: {
    timeout?: number;
    logger?: {
      info: (msg: string, meta?: Record<string, unknown>) => void;
      error: (msg: string, meta?: Record<string, unknown>) => void;
    };
  }
): Promise<void> {
  const logger = options?.logger ?? console;
  const timeout = options?.timeout ?? 15000;

  logger.info('[Shutdown] Stopping workers', { count: workers.length });

  const stopPromises = workers.map(async (worker) => {
    try {
      await worker.stop();
      logger.info('[Shutdown] Worker stopped');
    } catch (error) {
      logger.error('[Shutdown] Worker stop error', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
  });

  await Promise.race([
    Promise.all(stopPromises),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Worker stop timeout')), timeout)
    ),
  ]);
}

/**
 * Shutdown browser contexts
 */
export async function shutdownBrowserContexts(
  contexts: Array<{ close: () => Promise<void> }>,
  options?: {
    timeout?: number;
    logger?: {
      info: (msg: string, meta?: Record<string, unknown>) => void;
      error: (msg: string, meta?: Record<string, unknown>) => void;
    };
  }
): Promise<void> {
  const logger = options?.logger ?? console;
  const timeout = options?.timeout ?? 10000;

  logger.info('[Shutdown] Closing browser contexts', { count: contexts.length });

  const closePromises = contexts.map(async (context) => {
    try {
      await context.close();
      logger.info('[Shutdown] Browser context closed');
    } catch (error) {
      logger.error('[Shutdown] Browser context close error', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
  });

  await Promise.race([
    Promise.all(closePromises),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Browser context close timeout')), timeout)
    ),
  ]);
}

// =============================================================================
// STATE
// =============================================================================

/**
 * Check if shutdown is in progress
 */
export function getIsShuttingDown(): boolean {
  return getIsShuttingDown();
}
