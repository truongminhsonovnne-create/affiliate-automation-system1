/**
 * Release Verification Runner Module
 *
 * Executes release verification checks for CI/CD.
 */

import type {
  PostDeployVerificationResult,
  PostDeployVerificationOptions,
  CiEnvironment,
} from '../types';
import {
  HEALTH_CHECK_TIMEOUT,
  READINESS_CHECK_TIMEOUT,
  CONTROL_PLANE_CHECK_TIMEOUT,
  WORKER_BOOT_CHECK_TIMEOUT,
} from '../constants';

// =============================================================================
// Verification Functions
// =============================================================================

/**
 * Run pre-deploy verification
 */
export async function runPreDeployVerification(
  options?: Partial<PostDeployVerificationOptions>
): Promise<{
  passed: boolean;
  checks: PostDeployVerificationResult[];
}> {
  const environment = options?.environment || 'staging';

  const checks: PostDeployVerificationResult[] = [];

  // Check 1: Build artifacts
  checks.push(await checkBuildArtifacts());

  // Check 2: Type safety
  checks.push(await checkTypeSafety());

  // Check 3: Configuration
  checks.push(await checkConfiguration(environment));

  const passed = checks.filter((c) => c.passed).length === checks.length;

  return { passed, checks };
}

/**
 * Run post-deploy verification
 */
export async function runPostDeployVerification(
  options?: Partial<PostDeployVerificationOptions>
): Promise<{
  passed: boolean;
  checks: PostDeployVerificationResult[];
}> {
  const environment = options?.environment || 'staging';
  const baseUrl = options?.baseUrl || '';
  const controlPlaneUrl = options?.controlPlaneUrl || '';
  const timeout = options?.timeout || HEALTH_CHECK_TIMEOUT;

  const checks: PostDeployVerificationResult[] = [];

  // Check 1: Liveness
  if (baseUrl) {
    checks.push(await checkLiveness(baseUrl, timeout));
  }

  // Check 2: Readiness
  if (baseUrl) {
    checks.push(await checkReadiness(baseUrl, timeout));
  }

  // Check 3: Control plane
  if (controlPlaneUrl) {
    checks.push(await checkControlPlane(controlPlaneUrl, timeout));
  }

  // Check 4: Dashboard/API
  if (baseUrl) {
    checks.push(await checkDashboard(baseUrl, timeout));
  }

  const passed = checks.filter((c) => c.passed).length === checks.length;

  return { passed, checks };
}

/**
 * Run smoke verification
 */
export async function runSmokeVerification(
  options?: Partial<PostDeployVerificationOptions>
): Promise<{
  passed: boolean;
  checks: PostDeployVerificationResult[];
}> {
  const environment = options?.environment || 'staging';
  const baseUrl = options?.baseUrl || '';

  const checks: PostDeployVerificationResult[] = [];

  // Quick smoke test: just check if services respond
  if (baseUrl) {
    checks.push(await checkLiveness(baseUrl, 10));
  }

  // Check configuration
  checks.push(await checkConfiguration(environment));

  const passed = checks.filter((c) => c.passed).length === checks.length;

  return { passed, checks };
}

// =============================================================================
// Individual Check Functions
// =============================================================================

/**
 * Check build artifacts exist
 */
async function checkBuildArtifacts(): Promise<PostDeployVerificationResult> {
  const start = Date.now();

  try {
    const { access } = await import('fs/promises');
    await access('./dist');

    return {
      check: 'build-artifacts',
      passed: true,
      duration: Date.now() - start,
    };
  } catch {
    return {
      check: 'build-artifacts',
      passed: false,
      duration: Date.now() - start,
      error: 'Build artifacts not found',
    };
  }
}

/**
 * Check type safety
 */
async function checkTypeSafety(): Promise<PostDeployVerificationResult> {
  const start = Date.now();

  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    await execAsync('npx tsc --noEmit', { timeout: 60000 });

    return {
      check: 'type-safety',
      passed: true,
      duration: Date.now() - start,
    };
  } catch {
    return {
      check: 'type-safety',
      passed: false,
      duration: Date.now() - start,
      error: 'Type check failed',
    };
  }
}

/**
 * Check configuration
 */
async function checkConfiguration(environment: CiEnvironment): Promise<PostDeployVerificationResult> {
  const start = Date.now();

  // Check if required env vars are set
  const required = getRequiredEnvVars(environment);
  const missing: string[] = [];

  for (const varName of required) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  return {
    check: 'configuration',
    passed: missing.length === 0,
    duration: Date.now() - start,
    details: { environment, missing },
  };
}

/**
 * Check liveness endpoint
 */
async function checkLiveness(baseUrl: string, timeout: number): Promise<PostDeployVerificationResult> {
  const start = Date.now();

  try {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch(`${baseUrl}/health/live`, {
      method: 'GET',
      signal: AbortSignal.timeout(timeout * 1000),
    });

    return {
      check: 'liveness',
      passed: response.ok || response.status === 200,
      duration: Date.now() - start,
      details: { status: response.status },
    };
  } catch (error) {
    return {
      check: 'liveness',
      passed: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Liveness check failed',
    };
  }
}

/**
 * Check readiness endpoint
 */
async function checkReadiness(baseUrl: string, timeout: number): Promise<PostDeployVerificationResult> {
  const start = Date.now();

  try {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch(`${baseUrl}/health/ready`, {
      method: 'GET',
      signal: AbortSignal.timeout(timeout * 1000),
    });

    return {
      check: 'readiness',
      passed: response.ok || response.status === 200,
      duration: Date.now() - start,
      details: { status: response.status },
    };
  } catch (error) {
    return {
      check: 'readiness',
      passed: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Readiness check failed',
    };
  }
}

/**
 * Check control plane
 */
async function checkControlPlane(controlPlaneUrl: string, timeout: number): Promise<PostDeployVerificationResult> {
  const start = Date.now();

  try {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch(`${controlPlaneUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(timeout * 1000),
    });

    return {
      check: 'control-plane',
      passed: response.ok || response.status === 200,
      duration: Date.now() - start,
      details: { status: response.status },
    };
  } catch (error) {
    return {
      check: 'control-plane',
      passed: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Control plane check failed',
    };
  }
}

/**
 * Check dashboard/API
 */
async function checkDashboard(baseUrl: string, timeout: number): Promise<PostDeployVerificationResult> {
  const start = Date.now();

  try {
    const { default: fetch } = await import('node-fetch');

    // Try multiple endpoints
    const endpoints = ['/api/health', '/api/status', '/api/v1/health'];
    let passed = false;

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: 'GET',
          signal: AbortSignal.timeout(timeout * 1000),
        });

        if (response.ok || response.status === 200) {
          passed = true;
          break;
        }
      } catch {
        continue;
      }
    }

    return {
      check: 'dashboard',
      passed,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      check: 'dashboard',
      passed: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Dashboard check failed',
    };
  }
}

// =============================================================================
// Summary Builder
// =============================================================================

/**
 * Build verification summary
 */
export function buildVerificationSummary(
  results: PostDeployVerificationResult[]
): {
  total: number;
  passed: number;
  failed: number;
  passedPercentage: number;
} {
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  const passedPercentage = total > 0 ? Math.round((passed / total) * 100) : 0;

  return {
    total,
    passed,
    failed,
    passedPercentage,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get required environment variables
 */
function getRequiredEnvVars(environment: CiEnvironment): string[] {
  const base = ['NODE_ENV'];

  if (environment === 'production') {
    return [...base, 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  }

  return [...base, 'SUPABASE_URL'];
}
