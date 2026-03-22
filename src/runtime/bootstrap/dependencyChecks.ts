/**
 * Runtime Layer - Dependency Checks
 * Startup dependency verification
 */

import type { RuntimeRole, RuntimeDependencyCheckResult } from '../types';
import { DEPENDENCY_CHECK_TIMEOUT_MS, DATABASE_CONNECTION_TIMEOUT_MS } from '../constants';

// =============================================================================
// DEPENDENCY CHECKS
// =============================================================================

/**
 * Run database dependency check
 */
export async function runDatabaseDependencyCheck(
  options?: {
    timeout?: number;
  }
): Promise<RuntimeDependencyCheckResult> {
  const timeout = options?.timeout ?? DATABASE_CONNECTION_TIMEOUT_MS;

  const start = Date.now();

  try {
    // Check database connectivity
    // In production, this would actually connect to Supabase
    const result = await Promise.race([
      checkDatabaseConnectivity(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      ),
    ]);

    return {
      name: 'database',
      status: result.healthy ? 'healthy' : 'degraded',
      latency: Date.now() - start,
      metadata: {
        databaseName: result.databaseName,
        connectionOk: result.healthy,
      },
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'unhealthy',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run Gemini API dependency check
 */
export async function runGeminiDependencyCheck(
  options?: {
    timeout?: number;
  }
): Promise<RuntimeDependencyCheckResult> {
  const timeout = options?.timeout ?? 10000;
  const start = Date.now();

  try {
    // Check Gemini API connectivity
    const result = await Promise.race([
      checkGeminiConnectivity(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      ),
    ]);

    return {
      name: 'gemini',
      status: result.healthy ? 'healthy' : 'degraded',
      latency: Date.now() - start,
      metadata: {
        endpoint: result.endpoint,
      },
    };
  } catch (error) {
    return {
      name: 'gemini',
      status: 'unhealthy',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run Supabase dependency check
 */
export async function runSupabaseDependencyCheck(
  options?: {
    timeout?: number;
  }
): Promise<RuntimeDependencyCheckResult> {
  const timeout = options?.timeout ?? 10000;
  const start = Date.now();

  try {
    const result = await Promise.race([
      checkSupabaseConnectivity(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      ),
    ]);

    return {
      name: 'supabase',
      status: result.healthy ? 'healthy' : 'degraded',
      latency: Date.now() - start,
      metadata: {
        url: result.url,
      },
    };
  } catch (error) {
    return {
      name: 'supabase',
      status: 'unhealthy',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run control plane dependency check
 */
export async function runControlPlaneDependencyCheck(
  options?: {
    timeout?: number;
  }
): Promise<RuntimeDependencyCheckResult> {
  const timeout = options?.timeout ?? 5000;
  const start = Date.now();

  try {
    const result = await Promise.race([
      checkControlPlaneHealth(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      ),
    ]);

    return {
      name: 'control-plane',
      status: result.healthy ? 'healthy' : 'degraded',
      latency: Date.now() - start,
      metadata: {
        version: result.version,
      },
    };
  } catch (error) {
    return {
      name: 'control-plane',
      status: 'degraded',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// ROLE-BASED CHECKS
// =============================================================================

/**
 * Run dependency checks for a specific role
 */
export async function runRoleDependencyChecks(
  role: RuntimeRole,
  options?: {
    timeout?: number;
  }
): Promise<RuntimeDependencyCheckResult[]> {
  const checks: RuntimeDependencyCheckResult[] = [];

  // Always check database
  checks.push(await runDatabaseDependencyCheck(options));

  // Role-specific checks
  switch (role) {
    case 'web':
      // Web needs Supabase
      checks.push(await runSupabaseDependencyCheck(options));
      break;

    case 'control-plane':
      // Control plane needs Supabase
      checks.push(await runSupabaseDependencyCheck(options));
      break;

    case 'worker-crawler':
      // Crawler needs Supabase
      checks.push(await runSupabaseDependencyCheck(options));
      break;

    case 'worker-ai':
      // AI worker needs Supabase and Gemini
      checks.push(await runSupabaseDependencyCheck(options));
      checks.push(await runGeminiDependencyCheck(options));
      break;

    case 'worker-publisher':
      // Publisher needs Supabase
      checks.push(await runSupabaseDependencyCheck(options));
      break;

    case 'ops-runner':
      // Ops needs Supabase and control plane
      checks.push(await runSupabaseDependencyCheck(options));
      checks.push(await runControlPlaneDependencyCheck(options));
      break;
  }

  return checks;
}

// =============================================================================
// SUMMARY
// =============================================================================

/**
 * Build dependency check summary
 */
export function buildDependencyCheckSummary(
  results: RuntimeDependencyCheckResult[]
): {
  healthy: string[];
  degraded: string[];
  unhealthy: string[];
  overall: 'healthy' | 'degraded' | 'unhealthy';
} {
  const healthy = results.filter((r) => r.status === 'healthy').map((r) => r.name);
  const degraded = results.filter((r) => r.status === 'degraded').map((r) => r.name);
  const unhealthy = results.filter((r) => r.status === 'unhealthy').map((r) => r.name);

  let overall: 'healthy' | 'degraded' | 'unhealthy';

  if (unhealthy.length > 0) {
    overall = 'unhealthy';
  } else if (degraded.length > 0) {
    overall = 'degraded';
  } else {
    overall = 'healthy';
  }

  return { healthy, degraded, unhealthy, overall };
}

// =============================================================================
// HELPER FUNCTIONS (Placeholders)
// =============================================================================

async function checkDatabaseConnectivity(): Promise<{ healthy: boolean; databaseName?: string }> {
  // Placeholder - in production, actually check database
  return { healthy: true, databaseName: 'affiliate_system' };
}

async function checkGeminiConnectivity(): Promise<{ healthy: boolean; endpoint?: string }> {
  // Placeholder - in production, actually check Gemini API
  return { healthy: true, endpoint: 'generativelanguage.googleapis.com' };
}

async function checkSupabaseConnectivity(): Promise<{ healthy: boolean; url?: string }> {
  // Placeholder - in production, actually check Supabase
  return { healthy: true, url: process.env.SUPABASE_URL };
}

async function checkControlPlaneHealth(): Promise<{ healthy: boolean; version?: string }> {
  // Placeholder - in production, actually check control plane
  return { healthy: true, version: '1.0.0' };
}
