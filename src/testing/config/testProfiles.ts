/**
 * Test Profiles Configuration
 *
 * Profile-based test execution configuration.
 */

import type { TestProfile, VerificationProfile, TestEnvironment } from '../types';
import {
  UNIT_TEST_TIMEOUT_MS,
  INTEGRATION_TEST_TIMEOUT_MS,
  WORKFLOW_TEST_TIMEOUT_MS,
  E2E_TEST_TIMEOUT_MS,
  SMOKE_TEST_TIMEOUT_MS,
  UNIT_TEST_RETRIES,
  INTEGRATION_TEST_RETRIES,
  WORKFLOW_TEST_RETRIES,
  E2E_TEST_RETRIES,
} from '../constants';

/**
 * Get test profile for environment
 */
export function getTestProfile(
  env: TestEnvironment,
  options?: {
    fast?: boolean;
    parallel?: boolean;
  }
): TestProfile {
  const fast = options?.fast ?? false;
  const parallel = options?.parallel ?? true;

  const multiplier = fast ? 0.5 : 1.0;

  switch (env) {
    case 'local':
      return {
        name: 'local',
        environment: env,
        layer: 'unit',
        timeoutMultiplier: multiplier,
        retries: 0,
        parallel,
        skipSlow: fast,
      };

    case 'ci':
      return {
        name: 'ci',
        environment: env,
        layer: 'integration',
        timeoutMultiplier: 1.0,
        retries: INTEGRATION_TEST_RETRIES,
        parallel: true,
        skipSlow: false,
      };

    case 'staging':
      return {
        name: 'staging',
        environment: env,
        layer: 'workflow',
        timeoutMultiplier: 1.5,
        retries: WORKFLOW_TEST_RETRIES,
        parallel: false,
        skipSlow: false,
      };

    case 'production':
      return {
        name: 'production',
        environment: env,
        layer: 'smoke',
        timeoutMultiplier: 1.0,
        retries: E2E_TEST_RETRIES,
        parallel: parallel,
        skipSlow: false,
      };

    default:
      return getTestProfile('local', options);
  }
}

/**
 * Resolve test environment profile
 */
export function resolveTestEnvironmentProfile(
  options?: {
    environment?: TestEnvironment;
    ci?: boolean;
    staging?: boolean;
  }
): TestProfile {
  if (options?.ci) {
    return getTestProfile('ci');
  }

  if (options?.staging) {
    return getTestProfile('staging');
  }

  return getTestProfile(options?.environment || 'local');
}

/**
 * Build verification profile
 */
export function buildVerificationProfile(
  options?: {
    type?: 'quick' | 'full' | 'staging';
    timeout?: number;
  }
): VerificationProfile {
  const type = options?.type || 'quick';
  const baseTimeout = options?.timeout || 30000;

  switch (type) {
    case 'quick':
      return {
        name: 'quick-smoke',
        checks: [
          { name: 'liveness', type: 'health', expectedStatus: 200 },
          { name: 'readiness', type: 'readiness', expectedStatus: 200 },
        ],
        timeout: baseTimeout,
      };

    case 'full':
      return {
        name: 'full-smoke',
        checks: [
          { name: 'liveness', type: 'health', expectedStatus: 200 },
          { name: 'readiness', type: 'readiness', expectedStatus: 200 },
          { name: 'database', type: 'database' },
          { name: 'workers', type: 'worker' },
        ],
        timeout: baseTimeout * 2,
      };

    case 'staging':
      return {
        name: 'staging-verification',
        checks: [
          { name: 'liveness', type: 'health', expectedStatus: 200 },
          { name: 'readiness', type: 'readiness', expectedStatus: 200 },
          { name: 'database', type: 'database', timeout: 15000 },
          { name: 'workers', type: 'worker', timeout: 60000 },
          { name: 'control-plane', type: 'api', endpoint: '/api/health' },
        ],
        timeout: baseTimeout * 3,
      };

    default:
      return buildVerificationProfile({ type: 'quick', timeout: baseTimeout });
  }
}

/**
 * Get timeout for test layer
 */
export function getTimeoutForLayer(layer: string): number {
  switch (layer) {
    case 'unit':
      return UNIT_TEST_TIMEOUT_MS;
    case 'integration':
      return INTEGRATION_TEST_TIMEOUT_MS;
    case 'workflow':
      return WORKFLOW_TEST_TIMEOUT_MS;
    case 'e2e':
      return E2E_TEST_TIMEOUT_MS;
    case 'smoke':
      return SMOKE_TEST_TIMEOUT_MS;
    default:
      return INTEGRATION_TEST_TIMEOUT_MS;
  }
}

/**
 * Get retries for test layer
 */
export function getRetriesForLayer(layer: string): number {
  switch (layer) {
    case 'unit':
      return UNIT_TEST_RETRIES;
    case 'integration':
      return INTEGRATION_TEST_RETRIES;
    case 'workflow':
      return WORKFLOW_TEST_RETRIES;
    case 'e2e':
      return E2E_TEST_RETRIES;
    default:
      return 0;
  }
}
