/**
 * Post-Deploy Smoke Pack
 *
 * Provides smoke test packs for post-deployment verification.
 */

import type { VerificationPack, SmokeCheckResult } from '../types';
import { QUICK_SMOKE_TIME_BUDGET_MS, FULL_SMOKE_TIME_BUDGET_MS } from '../constants';

/**
 * Smoke check endpoint
 */
export interface SmokeCheckEndpoint {
  name: string;
  url: string;
  expectedStatus: number;
  timeout: number;
}

/**
 * Default smoke check endpoints
 */
export const DEFAULT_SMOKE_ENDPOINTS: SmokeCheckEndpoint[] = [
  {
    name: 'liveness',
    url: '/health/live',
    expectedStatus: 200,
    timeout: 5000,
  },
  {
    name: 'readiness',
    url: '/health/ready',
    expectedStatus: 200,
    timeout: 15000,
  },
];

/**
 * Extended smoke check endpoints
 */
export const EXTENDED_SMOKE_ENDPOINTS: SmokeCheckEndpoint[] = [
  ...DEFAULT_SMOKE_ENDPOINTS,
  {
    name: 'health',
    url: '/health',
    expectedStatus: 200,
    timeout: 10000,
  },
  {
    name: 'metrics',
    url: '/metrics',
    expectedStatus: 200,
    timeout: 10000,
  },
];

/**
 * Create post-deploy smoke pack
 */
export function createPostDeploySmokePack(
  type: 'quick' | 'full' = 'quick'
): VerificationPack {
  const isFull = type === 'full';
  const endpoints = isFull ? EXTENDED_SMOKE_ENDPOINTS : DEFAULT_SMOKE_ENDPOINTS;

  return {
    name: `postdeploy-${type}`,
    description: `Post-deploy ${type} smoke tests`,
    environment: 'production',
    scenarios: endpoints.map((endpoint) => ({
      id: `smoke-${endpoint.name}`,
      name: `${endpoint.name} Check`,
      description: `Verify ${endpoint.name} endpoint`,
      layer: 'smoke' as const,
      tags: ['smoke', 'postdeploy', endpoint.name],
      timeout: endpoint.timeout,
    })),
    timeout: isFull ? FULL_SMOKE_TIME_BUDGET_MS : QUICK_SMOKE_TIME_BUDGET_MS,
    parallel: true,
  };
}

/**
 * Run smoke check
 */
export async function runSmokeCheck(
  endpoint: SmokeCheckEndpoint,
  baseUrl: string
): Promise<SmokeCheckResult> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout);

    const response = await fetch(`${baseUrl}${endpoint.url}`, {
      signal: controller.signal,
      method: 'GET',
    });

    clearTimeout(timeoutId);

    const passed = response.status === endpoint.expectedStatus;
    const duration = Date.now() - startTime;

    return {
      check: endpoint.name,
      passed,
      endpoint: endpoint.url,
      responseTime: duration,
      error: passed ? undefined : `Expected ${endpoint.expectedStatus}, got ${response.status}`,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      check: endpoint.name,
      passed: false,
      endpoint: endpoint.url,
      responseTime: duration,
      error: errorMessage,
    };
  }
}

/**
 * Run all smoke checks
 */
export async function runSmokeChecks(
  endpoints: SmokeCheckEndpoint[],
  baseUrl: string,
  parallel = true
): Promise<SmokeCheckResult[]> {
  if (parallel) {
    return Promise.all(endpoints.map((ep) => runSmokeCheck(ep, baseUrl)));
  }

  const results: SmokeCheckResult[] = [];
  for (const endpoint of endpoints) {
    const result = await runSmokeCheck(endpoint, baseUrl);
    results.push(result);
  }
  return results;
}

/**
 * Validate smoke check results
 */
export function validateSmokeResults(
  results: SmokeCheckResult[]
): {
  passed: boolean;
  passedCount: number;
  failedCount: number;
  results: SmokeCheckResult[];
} {
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  return {
    passed: failedCount === 0,
    passedCount,
    failedCount,
    results,
  };
}

/**
 * Get smoke pack summary
 */
export function getSmokePackSummary(
  results: SmokeCheckResult[]
): {
  total: number;
  passed: number;
  failed: number;
  avgResponseTime: number;
  maxResponseTime: number;
} {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const responseTimes = results
    .map((r) => r.responseTime ?? 0)
    .filter((t) => t > 0);

  const avgResponseTime =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

  const maxResponseTime = Math.max(...responseTimes, 0);

  return {
    total: results.length,
    passed,
    failed,
    avgResponseTime,
    maxResponseTime,
  };
}

/**
 * Quick smoke pack for rapid deployment verification
 */
export const quickSmokePack = createPostDeploySmokePack('quick');

/**
 * Full smoke pack for comprehensive deployment verification
 */
export const fullSmokePack = createPostDeploySmokePack('full');

/**
 * Get smoke pack by type
 */
export function getSmokePack(type: 'quick' | 'full'): VerificationPack {
  return createPostDeploySmokePack(type);
}
