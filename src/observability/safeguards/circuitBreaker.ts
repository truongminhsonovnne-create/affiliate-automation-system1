/**
 * Circuit Breaker
 *
 * Production-grade circuit breaker implementation with
 * closed, open, and half-open states for fault tolerance.
 */

import { createLogger } from '../logger/structuredLogger.js';
import type { CircuitBreakerState, CircuitState, CircuitBreakerConfig } from '../types.js';
import {
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  CIRCUIT_BREAKER_CONFIGS,
} from '../constants.js';
import { incrementCounter } from '../metrics/inMemoryMetrics.js';
import { SAFEGUARD_METRICS } from '../metrics/metricNames.js';

const logger = createLogger({ subsystem: 'circuit_breaker' });

/** Circuit breaker states per component */
const breakers: Map<string, CircuitBreakerState> = new Map();

/** Circuit breaker configurations */
const configs: Map<string, CircuitBreakerConfig> = new Map();

/**
 * Get or create circuit breaker config
 */
function getConfig(name: string): CircuitBreakerConfig {
  let config = configs.get(name);
  if (!config) {
    config = CIRCUIT_BREAKER_CONFIGS[name] || {
      ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
      name,
    };
    configs.set(name, config);
  }
  return config;
}

/**
 * Get circuit breaker state
 */
export function getCircuitBreaker(name: string): CircuitBreakerState {
  let breaker = breakers.get(name);
  if (!breaker) {
    const config = getConfig(name);
    breaker = {
      name,
      state: 'closed',
      failureCount: 0,
      successCount: 0,
      totalCalls: 0,
      totalFailures: 0,
      totalSuccesses: 0,
    };
    breakers.set(name, breaker);
  }
  return breaker;
}

/**
 * Get all circuit breaker states
 */
export function getAllCircuitBreakers(): CircuitBreakerState[] {
  return Array.from(breakers.values());
}

/**
 * Check if circuit is closed (allowing calls)
 */
export function isCircuitClosed(name: string): boolean {
  const breaker = getCircuitBreaker(name);
  return breaker.state === 'closed';
}

/**
 * Check if circuit is open (blocking calls)
 */
export function isCircuitOpen(name: string): boolean {
  const breaker = getCircuitBreaker(name);
  return breaker.state === 'open';
}

/**
 * Check if circuit is half-open (testing recovery)
 */
export function isCircuitHalfOpen(name: string): boolean {
  const breaker = getCircuitBreaker(name);
  return breaker.state === 'half_open';
}

/**
 * Check if call is allowed
 */
export function isCallAllowed(name: string): boolean {
  const breaker = getCircuitBreaker(name);
  const config = getConfig(name);

  if (breaker.state === 'closed') {
    return true;
  }

  if (breaker.state === 'open') {
    // Check if timeout has passed
    if (breaker.nextAttemptAt && new Date(breaker.nextAttemptAt) <= new Date()) {
      // Transition to half-open
      breaker.state = 'half_open';
      breaker.successCount = 0;
      logger.info(`Circuit ${name} transitioned to half-open`);
      incrementCounter(SAFEGUARD_METRICS.CIRCUIT_BREAKER_HALF_OPEN, { circuit: name });
      return true;
    }
    return false;
  }

  // Half-open: allow limited calls
  const halfOpenCalls = breaker.successCount + breaker.failureCount;
  return halfOpenCalls < config.halfOpenMaxCalls;
}

/**
 * Record a successful call
 */
export function recordSuccess(name: string): void {
  const breaker = getCircuitBreaker(name);
  const config = getConfig(name);

  breaker.totalCalls++;
  breaker.totalSuccesses++;

  if (breaker.state === 'closed') {
    // Reset failure count on success
    breaker.failureCount = 0;
  } else if (breaker.state === 'half_open') {
    breaker.successCount++;

    if (breaker.successCount >= config.successThreshold) {
      // Transition to closed
      breaker.state = 'closed';
      breaker.failureCount = 0;
      breaker.successCount = 0;
      logger.info(`Circuit ${name} transitioned to closed`);
      incrementCounter(SAFEGUARD_METRICS.CIRCUIT_BREAKER_CLOSED, { circuit: name });
    }
  }
}

/**
 * Record a failed call
 */
export function recordFailure(name: string, reason?: string): void {
  const breaker = getCircuitBreaker(name);
  const config = getConfig(name);

  breaker.totalCalls++;
  breaker.totalFailures++;
  breaker.failureCount++;
  breaker.lastFailureAt = new Date().toISOString();
  breaker.lastFailureReason = reason;

  if (breaker.state === 'closed') {
    if (breaker.failureCount >= config.failureThreshold) {
      // Transition to open
      breaker.state = 'open';
      breaker.nextAttemptAt = new Date(Date.now() + config.timeoutMs).toISOString();
      logger.warn(`Circuit ${name} transitioned to open after ${breaker.failureCount} failures`);
      incrementCounter(SAFEGUARD_METRICS.CIRCUIT_BREAKER_OPENED, { circuit: name });
    }
  } else if (breaker.state === 'half_open') {
    // Transition back to open
    breaker.state = 'open';
    breaker.nextAttemptAt = new Date(Date.now() + config.timeoutMs).toISOString();
    logger.warn(`Circuit ${name} transitioned to open after half-open failure`);
    incrementCounter(SAFEGUARD_METRICS.CIRCUIT_BREAKER_OPENED, { circuit: name });
  }
}

/**
 * Execute a function with circuit breaker protection
 */
export async function executeWithCircuit<T>(
  name: string,
  fn: () => Promise<T>,
  options?: {
    fallback?: () => Promise<T>;
    onFailure?: (error: Error) => void;
  }
): Promise<T> {
  if (!isCallAllowed(name)) {
    const breaker = getCircuitBreaker(name);
    logger.warn(`Circuit ${name} is open, call blocked`);

    // Try fallback if provided
    if (options?.fallback) {
      logger.info(`Executing fallback for ${name}`);
      return options.fallback();
    }

    throw new Error(`Circuit breaker ${name} is open`);
  }

  try {
    const result = await fn();
    recordSuccess(name);
    return result;
  } catch (err) {
    const error = err as Error;
    recordFailure(name, error.message);
    options?.onFailure?.(error);
    throw err;
  }
}

/**
 * Execute a synchronous function with circuit breaker protection
 */
export function executeWithCircuitSync<T>(
  name: string,
  fn: () => T,
  options?: {
    fallback?: () => T;
    onFailure?: (error: Error) => void;
  }
): T {
  if (!isCallAllowed(name)) {
    const breaker = getCircuitBreaker(name);
    logger.warn(`Circuit ${name} is open, call blocked`);

    if (options?.fallback) {
      logger.info(`Executing fallback for ${name}`);
      return options.fallback();
    }

    throw new Error(`Circuit breaker ${name} is open`);
  }

  try {
    const result = fn();
    recordSuccess(name);
    return result;
  } catch (err) {
    const error = err as Error;
    recordFailure(name, error.message);
    options?.onFailure?.(error);
    throw err;
  }
}

/**
 * Reset a specific circuit breaker
 */
export function resetCircuitBreaker(name: string): void {
  const breaker = getCircuitBreaker(name);
  breaker.state = 'closed';
  breaker.failureCount = 0;
  breaker.successCount = 0;
  breaker.lastFailureAt = undefined;
  breaker.lastFailureReason = undefined;
  breaker.nextAttemptAt = undefined;
  logger.info(`Circuit ${name} manually reset`);
}

/**
 * Reset all circuit breakers
 */
export function resetAllCircuitBreakers(): void {
  for (const [name] of breakers) {
    resetCircuitBreaker(name);
  }
}

/**
 * Get circuit breaker health
 */
export function getCircuitBreakerHealth(): { closed: number; open: number; halfOpen: number } {
  let closed = 0;
  let open = 0;
  let halfOpen = 0;

  for (const breaker of breakers.values()) {
    if (breaker.state === 'closed') closed++;
    else if (breaker.state === 'open') open++;
    else if (breaker.state === 'half_open') halfOpen++;
  }

  return { closed, open, halfOpen };
}
