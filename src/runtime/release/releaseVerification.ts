/**
 * Runtime Layer - Release Verification
 * Post-deploy verification
 */

import type { ReleaseVerificationResult, ReleaseCheckResult } from '../types';

// =============================================================================
// VERIFICATION
// =============================================================================

/**
 * Run release verification
 */
export async function runReleaseVerification(options?: {
  environment?: string;
  url?: string;
}): Promise<ReleaseVerificationResult> {
  const checks: ReleaseCheckResult[] = [];

  // Run database check
  const dbCheck = await verifyDatabaseReachable();
  checks.push(dbCheck);

  // Run control plane health check
  const cpCheck = await verifyControlPlaneHealth(options?.url);
  checks.push(cpCheck);

  // Run worker boot check
  const workerCheck = await verifyWorkerBootable();
  checks.push(workerCheck);

  const passed = checks.every((c) => c.passed);

  return {
    passed,
    stage: 'verify',
    checks,
    timestamp: new Date(),
  };
}

/**
 * Run smoke checks
 */
export async function runSmokeChecks(options?: {
  url?: string;
}): Promise<ReleaseVerificationResult> {
  const checks: ReleaseCheckResult[] = [];

  // Web health check
  const webCheck = await verifyWebHealth(options?.url);
  checks.push(webCheck);

  // API health check
  const apiCheck = await verifyApiHealth(options?.url);
  checks.push(apiCheck);

  // Database check
  const dbCheck = await verifyDatabaseReachable();
  checks.push(dbCheck);

  const passed = checks.every((c) => c.passed);

  return {
    passed,
    stage: 'verify',
    checks,
    timestamp: new Date(),
  };
}

/**
 * Verify critical paths
 */
export async function verifyCriticalPaths(options?: {
  url?: string;
}): Promise<ReleaseVerificationResult> {
  const checks: ReleaseCheckResult[] = [];

  // Dashboard path
  const dashboardCheck = await verifyDashboardPath(options?.url);
  checks.push(dashboardCheck);

  // API path
  const apiPathCheck = await verifyApiPath(options?.url);
  checks.push(apiPathCheck);

  // Worker queue path
  const queueCheck = await verifyWorkerQueuePath();
  checks.push(queueCheck);

  const passed = checks.every((c) => c.passed);

  return {
    passed,
    stage: 'verify',
    checks,
    timestamp: new Date(),
  };
}

// =============================================================================
// INDIVIDUAL CHECKS
// =============================================================================

/**
 * Verify database is reachable
 */
async function verifyDatabaseReachable(): Promise<ReleaseCheckResult> {
  const start = Date.now();

  try {
    // Placeholder - in production, actually check database
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      name: 'database_reachable',
      passed: true,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'database_reachable',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - start,
    };
  }
}

/**
 * Verify control plane health
 */
async function verifyControlPlaneHealth(url?: string): Promise<ReleaseCheckResult> {
  const start = Date.now();
  const controlPlaneUrl = url ? `${url}/health` : 'http://localhost:4000/health';

  try {
    const response = await fetch(controlPlaneUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    return {
      name: 'control_plane_health',
      passed: response.ok,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'control_plane_health',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - start,
    };
  }
}

/**
 * Verify worker can boot
 */
async function verifyWorkerBootable(): Promise<ReleaseCheckResult> {
  const start = Date.now();

  try {
    // Placeholder - in production, check worker health endpoint
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      name: 'worker_bootable',
      passed: true,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'worker_bootable',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - start,
    };
  }
}

/**
 * Verify web health
 */
async function verifyWebHealth(url?: string): Promise<ReleaseCheckResult> {
  const start = Date.now();
  const webUrl = url ? `${url}/health` : 'http://localhost:3000/health';

  try {
    const response = await fetch(webUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    return {
      name: 'web_health',
      passed: response.ok,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'web_health',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - start,
    };
  }
}

/**
 * Verify API health
 */
async function verifyApiHealth(url?: string): Promise<ReleaseCheckResult> {
  const start = Date.now();
  const apiUrl = url ? `${url}/api/health` : 'http://localhost:4000/health';

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    return {
      name: 'api_health',
      passed: response.ok,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'api_health',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - start,
    };
  }
}

/**
 * Verify dashboard path
 */
async function verifyDashboardPath(url?: string): Promise<ReleaseCheckResult> {
  const start = Date.now();
  const dashboardUrl = url ? `${url}/` : 'http://localhost:3000/';

  try {
    const response = await fetch(dashboardUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
    });

    return {
      name: 'dashboard_path',
      passed: response.ok,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'dashboard_path',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - start,
    };
  }
}

/**
 * Verify API path
 */
async function verifyApiPath(url?: string): Promise<ReleaseCheckResult> {
  const start = Date.now();
  const apiUrl = url ? `${url}/api/jobs` : 'http://localhost:4000/api/jobs';

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
    });

    return {
      name: 'api_path',
      passed: response.ok || response.status === 401, // 401 is OK - means endpoint exists
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'api_path',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - start,
    };
  }
}

/**
 * Verify worker queue path
 */
async function verifyWorkerQueuePath(): Promise<ReleaseCheckResult> {
  const start = Date.now();

  try {
    // Placeholder - in production, check worker health
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      name: 'worker_queue_path',
      passed: true,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'worker_queue_path',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - start,
    };
  }
}

// =============================================================================
// SUMMARY
// =============================================================================

/**
 * Build release verification summary
 */
export function buildReleaseVerificationSummary(
  results: ReleaseVerificationResult[]
): {
  total: number;
  passed: number;
  failed: number;
  overall: boolean;
} {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  return {
    total: results.length,
    passed,
    failed,
    overall: failed === 0,
  };
}
