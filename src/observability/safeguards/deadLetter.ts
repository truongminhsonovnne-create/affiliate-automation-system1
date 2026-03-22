/**
 * Dead Letter & Quarantine Handler
 *
 * Production-grade dead letter handling for permanently failed jobs,
 * with quarantine workflow and resolution tracking.
 */

import { createLogger } from '../logger/structuredLogger.js';
import type { DeadLetterItem, DeadLetterStatus } from '../types.js';
import {
  DEAD_LETTER_MAX_ATTEMPTS,
  DEAD_LETTER_RETENTION_DAYS,
  DEAD_LETTER_AUTO_QUARANTINE,
} from '../constants.js';
import { incrementCounter } from '../metrics/inMemoryMetrics.js';
import { SAFEGUARD_METRICS } from '../metrics/metricNames.js';

const logger = createLogger({ subsystem: 'dead_letter' });

/** In-memory dead letter store */
const deadLetterStore: Map<string, DeadLetterItem> = new Map();

/** External repository (optional) */
let deadLetterRepository: {
  save: (item: DeadLetterItem) => Promise<void>;
  findByStatus: (status: DeadLetterStatus) => Promise<DeadLetterItem[]>;
  findByJobId: (jobId: string) => Promise<DeadLetterItem | null>;
  updateStatus: (id: string, status: DeadLetterStatus, resolution?: string) => Promise<void>;
  delete: (id: string) => Promise<void>;
} | null = null;

/**
 * Set dead letter repository
 */
export function setDeadLetterRepository(
  repo: typeof deadLetterRepository
): void {
  deadLetterRepository = repo;
}

/**
 * Create a dead letter item
 */
export function createDeadLetterItem(
  operation: string,
  errorMessage: string,
  options?: {
    originalJobId?: string;
    channel?: string;
    payload?: Record<string, unknown>;
    errorCode?: string;
    errorCategory?: string;
    attemptCount?: number;
    lastAttemptAt?: string;
    metadata?: Record<string, unknown>;
  }
): DeadLetterItem {
  const item: DeadLetterItem = {
    id: generateDeadLetterId(),
    originalJobId: options?.originalJobId,
    channel: options?.channel,
    operation,
    payload: options?.payload || {},
    errorCode: options?.errorCode,
    errorMessage,
    errorCategory: options?.errorCategory,
    attemptCount: options?.attemptCount || 1,
    lastAttemptAt: options?.lastAttemptAt || new Date().toISOString(),
    status: DEAD_LETTER_AUTO_QUARANTINE ? 'quarantined' : 'review',
    createdAt: new Date().toISOString(),
    metadata: options?.metadata,
  };

  return item;
}

/**
 * Generate unique dead letter ID
 */
function generateDeadLetterId(): string {
  return `dl_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Add item to dead letter
 */
export function addToDeadLetter(item: DeadLetterItem): void {
  deadLetterStore.set(item.id!, item);

  incrementCounter(SAFEGUARD_METRICS.DEAD_LETTER_ITEMS, {
    operation: item.operation,
    status: item.status,
  });

  logger.error(`Added to dead letter: ${item.operation}`, {
    deadLetterId: item.id,
    originalJobId: item.originalJobId,
    error: item.errorMessage,
    attemptCount: item.attemptCount,
  });

  // Persist if repository available
  if (deadLetterRepository) {
    deadLetterRepository.save(item).catch(err => {
      logger.error('Failed to persist dead letter item', err as Error);
    });
  }
}

/**
 * Move failed job to dead letter
 */
export function quarantineFailedJob(
  jobId: string,
  operation: string,
  error: Error,
  attemptCount: number,
  options?: {
    channel?: string;
    payload?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }
): DeadLetterItem {
  const item = createDeadLetterItem(operation, error.message, {
    originalJobId: jobId,
    channel: options?.channel,
    payload: options?.payload,
    errorCode: (error as any).code,
    errorCategory: categorizeError(error),
    attemptCount,
    lastAttemptAt: new Date().toISOString(),
    metadata: options?.metadata,
  });

  addToDeadLetter(item);
  return item;
}

/**
 * Check if job should be moved to dead letter
 */
export function shouldQuarantine(attemptCount: number): boolean {
  return attemptCount >= DEAD_LETTER_MAX_ATTEMPTS;
}

/**
 * Categorize error for tracking
 */
function categorizeError(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('timeout') || message.includes('timed out')) {
    return 'timeout';
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'rate_limit';
  }
  if (message.includes('auth') || message.includes('unauthorized') || message.includes('forbidden')) {
    return 'authentication';
  }
  if (message.includes('not found') || message.includes('404')) {
    return 'not_found';
  }
  if (message.includes('network') || message.includes('connection')) {
    return 'network';
  }
  if (message.includes('quota') || message.includes('limit')) {
    return 'quota';
  }

  return 'unknown';
}

/**
 * Get dead letter item by ID
 */
export function getDeadLetterItem(id: string): DeadLetterItem | undefined {
  return deadLetterStore.get(id);
}

/**
 * Get dead letter item by original job ID
 */
export function getDeadLetterByJobId(jobId: string): DeadLetterItem | undefined {
  for (const item of deadLetterStore.values()) {
    if (item.originalJobId === jobId) {
      return item;
    }
  }
  return undefined;
}

/**
 * Get all dead letter items
 */
export function getAllDeadLetters(filter?: {
  status?: DeadLetterStatus;
  operation?: string;
  since?: string;
}): DeadLetterItem[] {
  let items = Array.from(deadLetterStore.values());

  if (filter?.status) {
    items = items.filter(i => i.status === filter.status);
  }

  if (filter?.operation) {
    items = items.filter(i => i.operation === filter.operation);
  }

  if (filter?.since) {
    const sinceDate = new Date(filter.since);
    items = items.filter(i => new Date(i.createdAt) >= sinceDate);
  }

  // Sort by creation date descending
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return items;
}

/**
 * Get dead letter counts by status
 */
export function getDeadLetterCounts(): Record<DeadLetterStatus, number> {
  const counts: Record<DeadLetterStatus, number> = {
    quarantined: 0,
    review: 0,
    resolved: 0,
    discarded: 0,
  };

  for (const item of deadLetterStore.values()) {
    counts[item.status]++;
  }

  return counts;
}

/**
 * Update dead letter item status
 */
export function updateDeadLetterStatus(
  id: string,
  status: DeadLetterStatus,
  resolution?: string
): boolean {
  const item = deadLetterStore.get(id);
  if (!item) {
    return false;
  }

  item.status = status;

  if (resolution) {
    item.resolution = resolution;
  }

  if (status === 'resolved' || status === 'discarded') {
    item.resolvedAt = new Date().toISOString();
  }

  logger.info(`Dead letter status updated: ${id}`, { status, resolution });

  // Persist if repository available
  if (deadLetterRepository) {
    deadLetterRepository.updateStatus(id, status, resolution).catch(err => {
      logger.error('Failed to update dead letter status', err as Error);
    });
  }

  return true;
}

/**
 * Resolve dead letter item
 */
export function resolveDeadLetter(
  id: string,
  resolution: string,
  resolvedBy?: string
): boolean {
  const item = deadLetterStore.get(id);
  if (!item) {
    return false;
  }

  item.status = 'resolved';
  item.resolution = resolution;
  item.resolvedAt = new Date().toISOString();
  item.resolvedBy = resolvedBy;

  logger.info(`Dead letter resolved: ${id}`, { resolution, resolvedBy });

  if (deadLetterRepository) {
    deadLetterRepository.updateStatus(id, 'resolved', resolution).catch(err => {
      logger.error('Failed to resolve dead letter', err as Error);
    });
  }

  return true;
}

/**
 * Discard dead letter item
 */
export function discardDeadLetter(id: string): boolean {
  const item = deadLetterStore.get(id);
  if (!item) {
    return false;
  }

  item.status = 'discarded';
  item.resolvedAt = new Date().toISOString();

  logger.info(`Dead letter discarded: ${id}`);

  if (deadLetterRepository) {
    deadLetterRepository.updateStatus(id, 'discarded').catch(err => {
      logger.error('Failed to discard dead letter', err as Error);
    });
  }

  return true;
}

/**
 * Get items requiring review
 */
export function getItemsForReview(): DeadLetterItem[] {
  return getAllDeadLetters({ status: 'review' });
}

/**
 * Get items in quarantine
 */
export function getQuarantinedItems(): DeadLetterItem[] {
  return getAllDeadLetters({ status: 'quarantined' });
}

/**
 * Get items older than specified days
 */
export function getOldItems(daysOld: number = DEAD_LETTER_RETENTION_DAYS): DeadLetterItem[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysOld);

  return getAllDeadLetters({ since: cutoff.toISOString() });
}

/**
 * Delete old resolved/discarded items
 */
export function cleanupOldItems(daysOld: number = DEAD_LETTER_RETENTION_DAYS): number {
  const oldItems = getOldItems(daysOld);
  let deleted = 0;

  for (const item of oldItems) {
    if (item.status === 'resolved' || item.status === 'discarded') {
      deadLetterStore.delete(item.id!);
      deleted++;

      if (deadLetterRepository) {
        deadLetterRepository.delete(item.id!).catch(err => {
          logger.error('Failed to delete dead letter item', err as Error);
        });
      }
    }
  }

  if (deleted > 0) {
    logger.info(`Cleaned up ${deleted} old dead letter items`);
  }

  return deleted;
}

/**
 * Clear all dead letters (for testing)
 */
export function clearDeadLetters(): number {
  const count = deadLetterStore.size;
  deadLetterStore.clear();
  return count;
}
