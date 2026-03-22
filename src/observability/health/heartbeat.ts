/**
 * Worker Heartbeat
 *
 * Production-grade worker heartbeat tracking for distributed systems,
 * enabling detection of stuck or dead workers.
 */

import { createLogger } from '../logger/structuredLogger.js';
import type { WorkerHeartbeat } from '../types.js';
import {
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_MISSED_THRESHOLD,
  SERVICE_NAME,
} from '../constants.js';
import { incrementCounter } from '../metrics/inMemoryMetrics.js';
import { SYSTEM_METRICS } from '../metrics/metricNames.js';

const logger = createLogger({ subsystem: 'heartbeat' });

/** In-memory heartbeat store */
const heartbeatStore: Map<string, WorkerHeartbeat> = new Map();

/** Current worker ID */
let currentWorkerId: string | null = null;

/** Current worker name */
let currentWorkerName: string | null = null;

/** Heartbeat interval handle */
let heartbeatInterval: NodeJS.Timeout | null = null;

/** External heartbeat repository (optional) */
let heartbeatRepository: {
  save: (heartbeat: WorkerHeartbeat) => Promise<void>;
  findActive: () => Promise<WorkerHeartbeat[]>;
  updateLastSeen: (workerId: string) => Promise<void>;
} | null = null;

/**
 * Set heartbeat repository
 */
export function setHeartbeatRepository(
  repo: typeof heartbeatRepository
): void {
  heartbeatRepository = repo;
}

/**
 * Generate unique worker ID
 */
function generateWorkerId(): string {
  const hostname = process.env.HOSTNAME || 'unknown';
  const pid = process.pid;
  const random = Math.random().toString(36).substring(2, 8);
  return `${SERVICE_NAME}-${hostname}-${pid}-${random}`;
}

/**
 * Initialize worker heartbeat
 */
export function initializeWorker(
  workerName: string,
  existingWorkerId?: string
): WorkerHeartbeat {
  currentWorkerId = existingWorkerId || generateWorkerId();
  currentWorkerName = workerName;

  const heartbeat: WorkerHeartbeat = {
    workerId: currentWorkerId,
    workerName,
    status: 'alive',
    lastSeenAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
  };

  heartbeatStore.set(currentWorkerId, heartbeat);
  incrementCounter(SYSTEM_METRICS.HEARTBEATS_SENT);

  logger.info(`Initialized worker: ${workerName}`, {
    workerId: currentWorkerId,
  });

  return heartbeat;
}

/**
 * Get current worker ID
 */
export function getCurrentWorkerId(): string | null {
  return currentWorkerId;
}

/**
 * Get current worker info
 */
export function getCurrentWorker(): WorkerHeartbeat | null {
  if (!currentWorkerId) return null;
  return heartbeatStore.get(currentWorkerId) || null;
}

/**
 * Record heartbeat for current worker
 */
export function recordHeartbeat(options?: {
  currentJobId?: string;
  currentOperation?: string;
  metadata?: Record<string, unknown>;
}): void {
  if (!currentWorkerId) {
    logger.warn('Cannot record heartbeat: worker not initialized');
    return;
  }

  const heartbeat: WorkerHeartbeat = {
    workerId: currentWorkerId,
    workerName: currentWorkerName || 'unknown',
    status: 'alive',
    lastSeenAt: new Date().toISOString(),
    startedAt: heartbeatStore.get(currentWorkerId)?.startedAt || new Date().toISOString(),
    currentJobId: options?.currentJobId,
    currentOperation: options?.currentOperation,
    metadata: options?.metadata,
  };

  heartbeatStore.set(currentWorkerId, heartbeat);
  incrementCounter(SYSTEM_METRICS.HEARTBEATS_SENT);

  // Persist if repository available
  if (heartbeatRepository) {
    heartbeatRepository.save(heartbeat).catch(err => {
      logger.error('Failed to persist heartbeat', err as Error);
    });
  }

  logger.debug('Heartbeat recorded', {
    workerId: currentWorkerId,
    operation: options?.currentOperation,
  });
}

/**
 * Start automatic heartbeat
 */
export function startHeartbeat(
  options?: {
    workerName?: string;
    workerId?: string;
    onHeartbeat?: () => void | Promise<void>;
  }
): void {
  if (heartbeatInterval) {
    logger.warn('Heartbeat already running');
    return;
  }

  const workerName = options?.workerName || 'Worker';
  initializeWorker(workerName, options?.workerId);

  heartbeatInterval = setInterval(() => {
    try {
      recordHeartbeat();
      options?.onHeartbeat?.();
    } catch (err) {
      logger.error('Error in heartbeat', err as Error);
    }
  }, HEARTBEAT_INTERVAL_MS);

  // Don't prevent process exit
  if (heartbeatInterval.unref) {
    heartbeatInterval.unref();
  }

  logger.info(`Started heartbeat: ${HEARTBEAT_INTERVAL_MS}ms interval`);
}

/**
 * Stop automatic heartbeat
 */
export function stopHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    logger.info('Stopped heartbeat');
  }

  // Record shutdown
  if (currentWorkerId) {
    const heartbeat = heartbeatStore.get(currentWorkerId);
    if (heartbeat) {
      heartbeat.status = 'shutting_down';
      heartbeatStore.set(currentWorkerId, heartbeat);
    }
  }
}

/**
 * Mark worker as dead
 */
export function markWorkerDead(workerId: string): void {
  const heartbeat = heartbeatStore.get(workerId);
  if (heartbeat) {
    heartbeat.status = 'dead';
    heartbeatStore.set(workerId, heartbeat);
    incrementCounter(SYSTEM_METRICS.HEARTBEATS_MISSED);

    logger.warn('Worker marked as dead', { workerId });
  }
}

/**
 * Get all active workers
 */
export function getActiveWorkers(): WorkerHeartbeat[] {
  const now = Date.now();
  const threshold = HEARTBEAT_INTERVAL_MS * HEARTBEAT_MISSED_THRESHOLD;
  const workers: WorkerHeartbeat[] = [];

  for (const [, heartbeat] of heartbeatStore) {
    const lastSeen = new Date(heartbeat.lastSeenAt).getTime();
    const isActive = heartbeat.status !== 'dead' && (now - lastSeen) < threshold;

    if (isActive) {
      workers.push(heartbeat);
    }
  }

  return workers;
}

/**
 * Get worker by ID
 */
export function getWorker(workerId: string): WorkerHeartbeat | undefined {
  return heartbeatStore.get(workerId);
}

/**
 * Check if worker is alive
 */
export function isWorkerAlive(workerId: string): boolean {
  const heartbeat = heartbeatStore.get(workerId);
  if (!heartbeat) return false;

  if (heartbeat.status === 'dead') return false;

  const lastSeen = new Date(heartbeat.lastSeenAt).getTime();
  const threshold = HEARTBEAT_INTERVAL_MS * HEARTBEAT_MISSED_THRESHOLD;

  return Date.now() - lastSeen < threshold;
}

/**
 * Get stale workers (missed heartbeats)
 */
export function getStaleWorkers(): WorkerHeartbeat[] {
  const now = Date.now();
  const threshold = HEARTBEAT_INTERVAL_MS * HEARTBEAT_MISSED_THRESHOLD;
  const stale: WorkerHeartbeat[] = [];

  for (const [, heartbeat] of heartbeatStore) {
    const lastSeen = new Date(heartbeat.lastSeenAt).getTime();
    const age = now - lastSeen;

    if (heartbeat.status !== 'dead' && age > threshold) {
      stale.push(heartbeat);
    }
  }

  return stale;
}

/**
 * Get worker count
 */
export function getWorkerCount(): number {
  return heartbeatStore.size;
}

/**
 * Register external worker heartbeat
 */
export function registerExternalWorker(heartbeat: WorkerHeartbeat): void {
  heartbeatStore.set(heartbeat.workerId, heartbeat);
}

/**
 * Clear all heartbeats (for testing)
 */
export function clearHeartbeats(): void {
  heartbeatStore.clear();
}

/**
 * Setup graceful shutdown handlers
 */
export function setupGracefulShutdown(): void {
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully');
    stopHeartbeat();
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    stopHeartbeat();
  });

  process.on('beforeExit', () => {
    stopHeartbeat();
  });
}
