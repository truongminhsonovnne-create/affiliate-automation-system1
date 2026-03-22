// =============================================================================
// Source Health Tracker
// Tracks per-source health state for circuit breaker integration
// =============================================================================

import { logger } from '../../utils/logger.js';

export type SourceId = 'supabase' | 'masoffer' | 'accesstrade' | 'voucher_engine';
export type SourceHealthState = 'healthy' | 'degraded' | 'unhealthy';

export interface SourceHealthStatus {
  sourceId: SourceId;
  state: SourceHealthState;
  failureCount: number;
  consecutiveSuccesses: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  cooldownUntil: number | null; // epoch ms when cooldown ends
  isInCooldown: boolean;
}

interface SourceHealthEntry {
  sourceId: SourceId;
  state: SourceHealthState;
  failureCount: number;
  consecutiveSuccesses: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  cooldownUntil: number | null;
  lastStateChange: number; // epoch ms
}

// Circuit breaker configuration per source
const HEALTHY_THRESHOLD = 3;         // failures before degraded
const DEGRADED_THRESHOLD = 6;         // failures before unhealthy
const COOLDOWN_MS = 30_000;          // 30s cooldown after trip to unhealthy
const HALF_OPEN_SUCCESSES = 2;       // consecutive successes to close circuit
const RECOVERY_SUCCESS_COUNT = 3;    // successes to fully recover from degraded

// In-memory health state
const healthState = new Map<SourceId, SourceHealthEntry>();

function getEntry(sourceId: SourceId): SourceHealthEntry {
  if (!healthState.has(sourceId)) {
    healthState.set(sourceId, {
      sourceId,
      state: 'healthy',
      failureCount: 0,
      consecutiveSuccesses: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      cooldownUntil: null,
      lastStateChange: Date.now(),
    });
  }
  return healthState.get(sourceId)!;
}

/**
 * Record a failure for a source — advances failure counter and may trip circuit.
 */
export function recordSourceFailure(sourceId: SourceId, errorType?: string): void {
  const entry = getEntry(sourceId);
  entry.failureCount++;
  entry.consecutiveSuccesses = 0;
  entry.lastFailureTime = Date.now();

  const prevState = entry.state;

  if (entry.state === 'healthy' && entry.failureCount >= HEALTHY_THRESHOLD) {
    entry.state = 'degraded';
    entry.lastStateChange = Date.now();
    logger.warn({
      sourceId,
      failureCount: entry.failureCount,
      prevState,
      newState: entry.state,
      reason: 'Threshold reached',
    }, 'Source health degraded');
  } else if (entry.state === 'degraded' && entry.failureCount >= DEGRADED_THRESHOLD) {
    entry.state = 'unhealthy';
    entry.cooldownUntil = Date.now() + COOLDOWN_MS;
    entry.lastStateChange = Date.now();
    logger.error({
      sourceId,
      failureCount: entry.failureCount,
      prevState,
      newState: entry.state,
      cooldownUntil: new Date(entry.cooldownUntil).toISOString(),
      errorType,
      reason: 'Threshold reached — circuit tripped',
    }, 'Source circuit tripped to unhealthy');
  }
}

/**
 * Record a success for a source — may close circuit or recover state.
 */
export function recordSourceSuccess(sourceId: SourceId): void {
  const entry = getEntry(sourceId);
  entry.consecutiveSuccesses++;
  entry.lastSuccessTime = Date.now();
  entry.failureCount = Math.max(0, entry.failureCount - 1);

  const prevState = entry.state;

  if (entry.state === 'degraded' && entry.consecutiveSuccesses >= RECOVERY_SUCCESS_COUNT) {
    entry.state = 'healthy';
    entry.lastStateChange = Date.now();
    entry.consecutiveSuccesses = 0;
    logger.info({ sourceId, prevState, newState: entry.state }, 'Source health recovered to healthy');
  } else if (entry.state === 'unhealthy') {
    // Half-open: wait for successes before closing
    if (entry.consecutiveSuccesses >= HALF_OPEN_SUCCESSES) {
      entry.state = 'degraded';
      entry.cooldownUntil = null;
      entry.failureCount = Math.floor(entry.failureCount / 2); // partial reset
      entry.lastStateChange = Date.now();
      entry.consecutiveSuccesses = 0;
      logger.info({ sourceId, prevState, newState: entry.state }, 'Source circuit closing from half-open');
    }
  }
}

/**
 * Check if a source is currently available (not in cooldown).
 * Returns false if the source is unhealthy and still in cooldown.
 */
export function isSourceAvailable(sourceId: SourceId): boolean {
  const entry = getEntry(sourceId);
  if (entry.state === 'unhealthy' && entry.cooldownUntil !== null) {
    const now = Date.now();
    if (now < entry.cooldownUntil) {
      return false; // still in cooldown
    }
    // Cooldown expired — move to half-open (unhealthy but accepting probes)
    entry.state = 'unhealthy';
    entry.consecutiveSuccesses = 0;
    return true;
  }
  return entry.state !== 'unhealthy';
}

/**
 * Get current health status for all tracked sources.
 */
export function getAllSourceHealth(): SourceHealthStatus[] {
  const now = Date.now();
  const result: SourceHealthStatus[] = [];

  for (const sourceId of healthState.keys()) {
    result.push(getSourceHealth(sourceId, now));
  }

  return result;
}

/**
 * Get current health status for a single source.
 */
export function getSourceHealth(sourceId: SourceId, now?: number): SourceHealthStatus {
  const entry = getEntry(sourceId);
  const timestamp = now ?? Date.now();

  // Check if cooldown has expired
  let cooldownExpired = false;
  if (entry.cooldownUntil !== null && timestamp >= entry.cooldownUntil) {
    cooldownExpired = true;
  }

  let effectiveState = entry.state;
  if (entry.state === 'unhealthy' && cooldownExpired) {
    effectiveState = 'unhealthy'; // still unhealthy, but cooldown over → half-open
  }

  return {
    sourceId,
    state: effectiveState,
    failureCount: entry.failureCount,
    consecutiveSuccesses: entry.consecutiveSuccesses,
    lastFailureTime: entry.lastFailureTime,
    lastSuccessTime: entry.lastSuccessTime,
    cooldownUntil: entry.cooldownUntil,
    isInCooldown: entry.state === 'unhealthy' && !cooldownExpired,
  };
}

/**
 * Reset health state for a source (admin use).
 */
export function resetSourceHealth(sourceId: SourceId): void {
  healthState.delete(sourceId);
  logger.info({ sourceId }, 'Source health reset');
}

/**
 * Reset all source health state (admin use).
 */
export function resetAllSourceHealth(): void {
  healthState.clear();
  logger.info({}, 'All source health state reset');
}
