/**
 * Circuit Breaker Validation
 *
 * Validates circuit breaker behavior for reliability testing.
 */

import type { ReliabilityCheckResult } from '../types';

/**
 * Circuit breaker states
 */
export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeoutMs: number;
  halfOpenMaxCalls: number;
}

/**
 * Circuit breaker metrics
 */
export interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  totalCalls: number;
  rejectedCalls: number;
}

/**
 * Circuit breaker validation result
 */
export interface CircuitBreakerValidationResult {
  valid: boolean;
  state: CircuitBreakerState;
  metrics: CircuitBreakerMetrics;
  checks: ReliabilityCheckResult[];
}

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeoutMs: 30000,
  halfOpenMaxCalls: 3,
};

/**
 * Simulated circuit breaker
 */
export class SimulatedCircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private totalCalls = 0;
  private rejectedCalls = 0;
  private halfOpenCalls = 0;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
  }

  /**
   * Execute operation through circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.totalCalls++;

    // Check if circuit is open
    if (this.state === 'open') {
      // Check if timeout has passed to transition to half-open
      if (this.lastFailureTime && Date.now() - this.lastFailureTime.getTime() >= this.config.timeoutMs) {
        this.transitionToHalfOpen();
      } else {
        this.rejectedCalls++;
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Record success
   */
  private onSuccess(): void {
    this.successCount++;
    this.lastSuccessTime = new Date();

    if (this.state === 'half-open') {
      this.halfOpenCalls++;

      if (this.halfOpenCalls >= this.config.successThreshold) {
        this.transitionToClosed();
      }
    }
  }

  /**
   * Record failure
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.state === 'closed') {
      if (this.failureCount >= this.config.failureThreshold) {
        this.transitionToOpen();
      }
    } else if (this.state === 'half-open') {
      this.transitionToOpen();
    }
  }

  /**
   * Transition to closed state
   */
  private transitionToClosed(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenCalls = 0;
    console.log('Circuit breaker closed');
  }

  /**
   * Transition to open state
   */
  private transitionToOpen(): void {
    this.state = 'open';
    this.halfOpenCalls = 0;
    console.log('Circuit breaker opened');
  }

  /**
   * Transition to half-open state
   */
  private transitionToHalfOpen(): void {
    this.state = 'half-open';
    this.halfOpenCalls = 0;
    console.log('Circuit breaker half-open');
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Get metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalCalls: this.totalCalls,
      rejectedCalls: this.rejectedCalls,
    };
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    this.totalCalls = 0;
    this.rejectedCalls = 0;
    this.halfOpenCalls = 0;
  }
}

/**
 * Validate circuit breaker behavior
 */
export function validateCircuitBreaker(
  breaker: SimulatedCircuitBreaker,
  testScenario: 'failures' | 'successes' | 'timeout' | 'half-open'
): CircuitBreakerValidationResult {
  const checks: ReliabilityCheckResult[] = [];
  const metrics = breaker.getMetrics();

  switch (testScenario) {
    case 'failures': {
      // After enough failures, should transition to open
      const check: ReliabilityCheckResult = {
        check: 'circuit-opens-after-failures',
        passed: metrics.state === 'open',
        duration: 0,
        value: metrics.failureCount,
        threshold: 5,
      };
      checks.push(check);
      break;
    }

    case 'successes': {
      // After enough successes, should stay closed or transition to closed
      const check: ReliabilityCheckResult = {
        check: 'circuit-stays-closed',
        passed: metrics.state === 'closed',
        duration: 0,
      };
      checks.push(check);
      break;
    }

    case 'timeout': {
      // After timeout, should transition to half-open
      const check: ReliabilityCheckResult = {
        check: 'circuit-transitions-to-half-open',
        passed: metrics.state === 'half-open',
        duration: 0,
      };
      checks.push(check);
      break;
    }

    case 'half-open': {
      // In half-open, should allow limited calls
      const check: ReliabilityCheckResult = {
        check: 'half-open-allows-calls',
        passed: metrics.state === 'half-open' && metrics.totalCalls > 0,
        duration: 0,
        value: metrics.totalCalls,
      };
      checks.push(check);
      break;
    }
  }

  const valid = checks.every((c) => c.passed);

  return {
    valid,
    state: metrics.state,
    metrics,
    checks,
  };
}

/**
 * Run circuit breaker failure test
 */
export async function runCircuitBreakerFailureTest(
  config?: Partial<CircuitBreakerConfig>
): Promise<CircuitBreakerValidationResult> {
  const breaker = new SimulatedCircuitBreaker(config);

  // Simulate failures
  for (let i = 0; i < 5; i++) {
    try {
      await breaker.execute(async () => {
        throw new Error('Simulated failure');
      });
    } catch {
      // Expected
    }
  }

  return validateCircuitBreaker(breaker, 'failures');
}

/**
 * Run circuit breaker recovery test
 */
export async function runCircuitBreakerRecoveryTest(
  config?: Partial<CircuitBreakerConfig>
): Promise<CircuitBreakerValidationResult> {
  const breaker = new SimulatedCircuitBreaker(config);

  // First, open the circuit
  for (let i = 0; i < 5; i++) {
    try {
      await breaker.execute(async () => {
        throw new Error('Simulated failure');
      });
    } catch {
      // Expected
    }
  }

  // Wait for timeout
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Try to execute - should transition to half-open
  try {
    await breaker.execute(async () => 'success');
  } catch {
    // May fail if still open
  }

  return validateCircuitBreaker(breaker, 'timeout');
}

/**
 * Validate circuit breaker configuration
 */
export function validateCircuitBreakerConfig(
  config: CircuitBreakerConfig
): ReliabilityCheckResult {
  const errors: string[] = [];

  if (config.failureThreshold < 1) {
    errors.push('failureThreshold must be at least 1');
  }

  if (config.successThreshold < 1) {
    errors.push('successThreshold must be at least 1');
  }

  if (config.timeoutMs < 1000) {
    errors.push('timeoutMs should be at least 1000ms');
  }

  if (config.halfOpenMaxCalls < 1) {
    errors.push('halfOpenMaxCalls must be at least 1');
  }

  const start = Date.now();

  return {
    check: 'circuit-breaker-config',
    passed: errors.length === 0,
    duration: Date.now() - start,
    error: errors.length > 0 ? errors.join('; ') : undefined,
  };
}

/**
 * Create circuit breaker config
 */
export function createCircuitBreakerConfig(
  options?: Partial<CircuitBreakerConfig>
): CircuitBreakerConfig {
  return {
    ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
    ...options,
  };
}
